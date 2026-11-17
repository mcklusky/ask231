from django.db import migrations
from django.utils.text import slugify


VEHICLE_SUBCATEGORIES = [
    ("Vehicle Parts & Accessories", "vehicle-parts-accessories"),
    ("Cars", "cars"),
    ("Motorcycles & Scooters", "motorcycles-scooters"),
    ("Buses & Microbuses", "buses-microbuses"),
    ("Trucks & Trailers", "trucks-trailers"),
    ("Construction & Heavy Machinery", "construction-heavy-machinery"),
    ("Watercraft & Boats", "boats-watercraft"),
    ("Personal Mobility", "personal-mobility"),
    ("Auto Services", "auto-services"),
]


def align_vehicle_subcategories(apps, schema_editor):
    Category = apps.get_model("marketplace", "Category")
    SubCategory = apps.get_model("marketplace", "SubCategory")
    vehicles = Category.objects.filter(slug="vehicles").first()
    if not vehicles:
        return

    for order, (name, stable_slug) in enumerate(VEHICLE_SUBCATEGORIES):
        # Preserve existing URLs even where Jiji uses a different word order.
        aliases = [stable_slug, slugify(name)]
        if stable_slug == "boats-watercraft":
            aliases.extend(["watercraft-boats"])
        subcategory = SubCategory.objects.filter(category=vehicles, slug__in=aliases).first()
        if subcategory is None:
            subcategory = SubCategory.objects.create(
                category=vehicles,
                name=name,
                slug=stable_slug,
                sort_order=order,
            )
        else:
            subcategory.name = name
            subcategory.sort_order = order
            subcategory.save(update_fields=["name", "sort_order", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("marketplace", "0008_expand_categories")]
    operations = [migrations.RunPython(align_vehicle_subcategories, migrations.RunPython.noop)]
