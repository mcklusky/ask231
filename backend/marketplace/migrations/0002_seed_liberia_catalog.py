from django.db import migrations
from django.utils.text import slugify

COUNTY_TOWNS = {
    "Bomi": "Tubmanburg", "Bong": "Gbarnga", "Gbarpolu": "Bopolu",
    "Grand Bassa": "Buchanan", "Grand Cape Mount": "Robertsport",
    "Grand Gedeh": "Zwedru", "Grand Kru": "Barclayville", "Lofa": "Voinjama",
    "Margibi": "Kakata", "Maryland": "Harper", "Montserrado": "Monrovia",
    "Nimba": "Sanniquellie", "River Cess": "Cestos City", "River Gee": "Fish Town",
    "Sinoe": "Greenville",
}
CATEGORIES = {
    "Vehicles": ("Car", ["Cars", "Motorcycles", "Trucks & Buses", "Vehicle Parts"]),
    "Property": ("House", ["Houses", "Apartments", "Land", "Commercial Property"]),
    "Mobile Phones": ("Smartphone", ["Smartphones", "Basic Phones", "Phone Accessories"]),
    "Electronics": ("Monitor", ["Televisions", "Computers", "Audio", "Appliances"]),
    "Home and Furniture": ("Sofa", ["Furniture", "Kitchen", "Home Decor", "Appliances"]),
    "Fashion": ("Shirt", ["Men's Clothing", "Women's Clothing", "Shoes", "Accessories"]),
    "Jobs": ("BriefcaseBusiness", ["Full-time", "Part-time", "Temporary", "Internships"]),
    "Services": ("Wrench", ["Repairs", "Cleaning", "Transport", "Professional Services"]),
    "Agriculture": ("Wheat", ["Farm Equipment", "Crops", "Seeds", "Livestock"]),
    "Animals and Pets": ("PawPrint", ["Dogs", "Cats", "Livestock", "Pet Supplies"]),
    "Commercial Equipment": ("Factory", ["Tools", "Industrial Equipment", "Office Equipment"]),
    "Sports and Hobbies": ("Dumbbell", ["Sports Equipment", "Musical Instruments", "Outdoor"]),
    "Other Products": ("Package", ["Other Products"]),
}

def seed_catalog(apps, schema_editor):
    County = apps.get_model("marketplace", "County")
    Town = apps.get_model("marketplace", "Town")
    Category = apps.get_model("marketplace", "Category")
    SubCategory = apps.get_model("marketplace", "SubCategory")
    for county_name, town_name in COUNTY_TOWNS.items():
        county, _ = County.objects.get_or_create(name=county_name, defaults={"slug": slugify(county_name)})
        Town.objects.get_or_create(county=county, name=town_name, defaults={"slug": slugify(town_name)})
    for order, (name, (icon, subcategories)) in enumerate(CATEGORIES.items()):
        category, _ = Category.objects.get_or_create(name=name, defaults={"slug": slugify(name), "icon": icon, "sort_order": order})
        for child_order, child_name in enumerate(subcategories):
            SubCategory.objects.get_or_create(category=category, name=child_name, defaults={"slug": slugify(child_name), "sort_order": child_order})

def unseed_catalog(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [("marketplace", "0001_initial")]
    operations = [migrations.RunPython(seed_catalog, unseed_catalog)]
