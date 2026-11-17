from django.db import migrations
from django.utils.text import slugify


RENAMES = {
    "mobile-phones": ("Phones & Tablets", "Smartphone", 2),
    "home-and-furniture": ("Home, Furniture & Appliances", "Sofa", 4),
    "sports-and-hobbies": ("Leisure & Activities", "Dumbbell", 10),
    "agriculture": ("Food, Agriculture & Farming", "Wheat", 12),
    "commercial-equipment": ("Commercial Equipment & Tools", "Factory", 9),
    "animals-and-pets": ("Animals & Pets", "PawPrint", 13),
    "jobs": ("Jobs", "BriefcaseBusiness", 14),
    "services": ("Services", "Wrench", 7),
    "vehicles": ("Vehicles", "CarFront", 0),
    "property": ("Property", "House", 1),
    "electronics": ("Electronics", "Laptop", 3),
    "fashion": ("Fashion", "Shirt", 5),
    "other-products": ("Other Products", "Package", 17),
}

NEW_CATEGORIES = [
    ("Beauty & Personal Care", "Sparkles", 6, [
        "Hair Care", "Skin Care", "Makeup", "Fragrances", "Bath & Body", "Health & Wellness", "Vitamins & Supplements", "Beauty Tools", "Salon & Spa Services",
    ]),
    ("Repair & Construction", "Hammer", 8, [
        "Building Materials", "Tools & Hardware", "Electrical Supplies", "Plumbing Supplies", "Paint & Finishing", "Roofing & Ceilings", "Construction Equipment", "Building & Renovation Services",
    ]),
    ("Babies & Kids", "Baby", 11, [
        "Baby Clothing", "Children's Clothing", "Toys & Games", "Baby Gear", "Strollers & Car Seats", "Feeding & Nursing", "Nursery & Children's Furniture", "School Supplies",
    ]),
    ("Seeking Work & CVs", "FileText", 15, [
        "Job Seeker Profiles", "CV & Resume Services", "Internship Seekers", "Skilled Trades", "Domestic & Care Work", "Driving & Transport Work", "Other Job Seekers",
    ]),
    ("Business & Industry", "Factory", 16, [
        "Businesses for Sale", "Wholesale & Distribution", "Office Supplies", "Retail Equipment", "Industrial Supplies", "Restaurant & Catering Equipment", "Import & Export", "Business Services",
    ]),
]

EXPANSIONS = {
    "vehicles": ["Vehicle Parts & Accessories", "Buses & Microbuses", "Trucks & Trailers", "Construction & Heavy Machinery", "Boats & Watercraft", "Personal Mobility", "Auto Services"],
    "property": ["New Builds", "Houses & Apartments for Rent", "Houses & Apartments for Sale", "Short Stays", "Land for Rent", "Land for Sale", "Event Venues & Workspaces", "Commercial Property for Rent", "Commercial Property for Sale"],
    "mobile-phones": ["Phone Accessories", "Smart Watches", "Tablets", "Headphones"],
    "electronics": ["Laptops & Computers", "TV & Video", "Gaming Consoles", "Audio & Music Equipment", "Headphones", "Cameras", "Security & Surveillance", "Networking", "Printers & Scanners", "Computer Monitors", "Computer Hardware", "Computer Accessories", "Electronics Accessories", "Video Games", "Software"],
    "home-and-furniture": ["Furniture", "Lighting", "Storage & Organization", "Home Accessories", "Home Appliances", "Kitchen Appliances", "Kitchenware & Cookware", "Household Supplies", "Garden Supplies"],
    "fashion": ["Children's Fashion", "Bags & Purses", "Watches & Jewelry", "Traditional Clothing"],
    "services": ["Building & Trades Services", "Auto Services", "Computer & IT Services", "Repair Services", "Cleaning Services", "Printing Services", "Manufacturing Services", "Logistics Services", "Legal Services", "Tax & Financial Services", "Recruitment Services", "Rental Services", "Transport & Airport Transfers", "Travel & Tours", "Classes & Courses", "Child Care & Education", "Health & Beauty Services", "Fitness & Personal Training", "Party & Event Services", "Entertainment Services", "Wedding Services", "Photography & Video", "Landscaping & Gardening", "Pet Services", "Other Services"],
    "commercial-equipment": ["Farm Equipment", "Industrial Equipment", "Office Equipment", "Restaurant Equipment", "Retail & Shop Equipment", "Tools & Machinery", "Safety Equipment"],
    "sports-and-hobbies": ["Sports Equipment", "Musical Instruments", "Camping & Outdoors", "Arts & Crafts", "Books & Learning", "Collectibles", "Board Games & Puzzles"],
    "agriculture": ["Grains & Staples", "Fresh Produce", "Fish & Seafood", "Meat & Poultry", "Livestock", "Seeds & Seedlings", "Farm Equipment", "Fertilizer & Crop Care", "Animal Feed & Supplies", "Farm Tools"],
    "animals-and-pets": ["Dogs", "Cats", "Birds", "Fish & Aquatic Pets", "Livestock", "Pet Supplies", "Pet Services"],
    "jobs": ["Accounting & Finance", "Administration", "Construction & Trades", "Education", "Hospitality & Food Service", "Health Care", "IT & Telecommunications", "Logistics & Transport", "Sales & Marketing", "Security", "Skilled & Technical Work", "Other Jobs"],
}


def expand_catalog(apps, schema_editor):
    Category = apps.get_model("marketplace", "Category")
    SubCategory = apps.get_model("marketplace", "SubCategory")

    for slug, (name, icon, order) in RENAMES.items():
        category = Category.objects.filter(slug=slug).first()
        if category:
            category.name = name
            category.icon = icon
            category.sort_order = order
            category.save(update_fields=["name", "icon", "sort_order", "updated_at"])

    catalog_expansions = dict(EXPANSIONS)
    for name, icon, order, subcategories in NEW_CATEGORIES:
        category, _ = Category.objects.get_or_create(
            slug=slugify(name),
            defaults={"name": name, "icon": icon, "sort_order": order},
        )
        category.icon = icon
        category.sort_order = order
        category.save(update_fields=["icon", "sort_order", "updated_at"])
        catalog_expansions[slugify(name)] = subcategories

    for category_slug, subcategories in catalog_expansions.items():
        category = Category.objects.filter(slug=category_slug).first()
        if not category:
            continue
        existing = set(SubCategory.objects.filter(category=category).values_list("slug", flat=True))
        next_order = SubCategory.objects.filter(category=category).count()
        for name in subcategories:
            child_slug = slugify(name)
            if child_slug in existing:
                continue
            SubCategory.objects.create(
                category=category,
                name=name,
                slug=child_slug,
                sort_order=next_order,
            )
            next_order += 1


class Migration(migrations.Migration):
    dependencies = [("marketplace", "0007_favorite")]
    operations = [migrations.RunPython(expand_catalog, migrations.RunPython.noop)]
