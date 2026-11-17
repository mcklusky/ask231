from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("marketplace", "0010_expand_jiji_subcategories")]

    operations = [
        migrations.AddField(
            model_name="advertisement",
            name="country",
            field=models.CharField(default="Liberia", max_length=100),
        ),
        migrations.AddField(
            model_name="advertisement",
            name="region",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="advertisement",
            name="city",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name="advertisement",
            name="county",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="advertisements", to="marketplace.county"),
        ),
        migrations.AlterField(
            model_name="advertisement",
            name="town",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="advertisements", to="marketplace.town"),
        ),
        migrations.AlterField(
            model_name="advertisement",
            name="currency",
            field=models.CharField(default="LRD", max_length=3),
        ),
    ]
