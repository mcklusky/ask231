from django.db import migrations
from django.utils.text import slugify

def normalize_slugs(apps, schema_editor):
    Category = apps.get_model("marketplace", "Category")
    County = apps.get_model("marketplace", "County")
    Town = apps.get_model("marketplace", "Town")
    SubCategory = apps.get_model("marketplace", "SubCategory")
    for model in (Category, County):
        for item in model.objects.all():
            item.slug = slugify(item.name)
            item.save(update_fields=["slug"])
    for item in Town.objects.select_related("county").all():
        item.slug = slugify(item.name)
        item.save(update_fields=["slug"])
    for item in SubCategory.objects.select_related("category").all():
        item.slug = slugify(item.name)
        item.save(update_fields=["slug"])

class Migration(migrations.Migration):
    dependencies = [("marketplace", "0003_alter_advertisement_price")]
    operations = [migrations.RunPython(normalize_slugs, migrations.RunPython.noop)]
