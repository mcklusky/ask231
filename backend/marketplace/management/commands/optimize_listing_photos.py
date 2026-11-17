"""Convert listing photos uploaded before automatic optimisation existed.

    python manage.py optimize_listing_photos --dry-run   # report only
    python manage.py optimize_listing_photos             # convert

For each photo without a thumbnail: resize to a WebP display copy, create a thumbnail, strip metadata
(including GPS location), then delete the original file. Safe to run repeatedly.
"""
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import transaction

from marketplace.images import process_listing_photo
from marketplace.models import AdvertisementImage


class Command(BaseCommand):
    help = "Resize existing listing photos, create thumbnails and strip photo metadata."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="List what would change without touching files.")

    def handle(self, *args, dry_run=False, **options):
        pending = AdvertisementImage.objects.filter(thumbnail="").select_related("advertisement")
        total = pending.count()
        self.stdout.write(f"{total} photo(s) need optimising.")
        converted = failed = bytes_before = bytes_after = 0
        for photo in pending.iterator():
            name = photo.image.name
            try:
                size_before = photo.image.size
                if dry_run:
                    self.stdout.write(f"  would convert #{photo.pk} {name} ({size_before / 1024:.0f} KB)")
                    continue
                with photo.image.open("rb") as source:
                    processed = process_listing_photo(source)
                old_storage, old_name = photo.image.storage, photo.image.name
                with transaction.atomic():
                    photo.image.save(processed.display.name, processed.display, save=False)
                    photo.thumbnail.save(processed.thumbnail.name, processed.thumbnail, save=False)
                    photo.width, photo.height = processed.width, processed.height
                    photo.save(update_fields=["image", "thumbnail", "width", "height"])
                if old_name != photo.image.name:
                    old_storage.delete(old_name)
                converted += 1
                bytes_before += size_before
                bytes_after += photo.image.size + photo.thumbnail.size
                self.stdout.write(f"  converted #{photo.pk}: {size_before / 1024:.0f} KB -> {photo.image.size / 1024:.0f} KB (+{photo.thumbnail.size / 1024:.0f} KB thumbnail)")
            except (ValidationError, OSError, ValueError) as error:
                failed += 1
                self.stderr.write(f"  skipped #{photo.pk} {name}: {error}")
        if not dry_run:
            saved = (1 - bytes_after / bytes_before) * 100 if bytes_before else 0
            self.stdout.write(self.style.SUCCESS(f"Done: {converted} converted, {failed} skipped. {bytes_before / 1048576:.1f} MB -> {bytes_after / 1048576:.1f} MB ({saved:.0f}% smaller)."))
