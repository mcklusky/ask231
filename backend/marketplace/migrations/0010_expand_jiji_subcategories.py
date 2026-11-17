from django.db import migrations
from django.utils.text import slugify


CATALOG = {
    "vehicles": [
        "Vehicle Parts & Accessories", "Cars", "Motorcycles & Scooters", "Buses & Microbuses",
        "Trucks & Trailers", "Construction & Heavy Machinery", "Watercraft & Boats",
        "Personal Mobility", "Auto Services",
    ],
    "property": [
        "New Builds", "Houses & Apartments For Rent", "Houses & Apartments For Sale", "Short Let",
        "Land & Plots for Rent", "Land & Plots For Sale", "Event Centres, Venues & Workstations",
        "Commercial Property For Rent", "Commercial Property For Sale",
    ],
    "mobile-phones": [
        "Mobile Phones", "Accessories for Phones & Tablets", "Smart Watches", "Tablets", "Headphones",
    ],
    "electronics": [
        "Laptops & Computers", "TV & Video Equipment", "Video Game Consoles", "Audio & Music Equipment",
        "Headphones", "Photo & Video Cameras", "Security & Surveillance", "Networking Products",
        "Printers & Scanners", "Computer Monitors", "Computer Hardware", "Computer Accessories",
        "Accessories & Supplies for Electronics", "Video Games", "Software",
    ],
    "home-and-furniture": [
        "Furniture", "Lighting", "Storage & Organization", "Home Accessories", "Home Appliances",
        "Kitchen Appliances", "Kitchenware & Cookware", "Household Chemicals", "Garden Supplies",
    ],
    "fashion": ["Women's Fashion", "Men's Fashion", "Baby&Kids’ Fashion"],
    "beauty-personal-care": [
        "Hair Beauty", "Face Care", "Oral Care", "Body Care", "Fragrance", "Makeup",
        "Sexual Wellness", "Tools & Accessories", "Vitamins & Supplements", "Massagers",
        "Health & Beauty Services",
    ],
    "services": [
        "Building & Trades Services", "Auto Services", "Computer & IT Services", "Repair Services",
        "Cleaning Services", "Printing Services", "Manufacturing Services", "Logistics Services",
        "Legal Services", "Tax & Financial Services", "Recruitment Services", "Rental Services",
        "Chauffeur & Airport Transfer Services", "Travel Agents & Tours", "Classes & Courses",
        "Child Care & Education Services", "Health & Beauty Services", "Fitness & Personal Training Services",
        "Party, Catering & Event Services", "DJ & Entertainment Services", "Wedding Venues & Services",
        "Photography & Video Services", "Landscaping & Gardening Services", "Pet Services", "Other Services",
    ],
    "repair-construction": [
        "Electrical Equipment", "Building Materials & Supplies", "Plumbing & Water Systems",
        "Electrical Hand Tools", "Generators", "Inverters & Backup Batteries", "Battery Chargers",
        "Diesel Generators", "Hand Tools", "Water Pumps", "Doors & Security", "Power Tools",
    ],
    "commercial-equipment": [
        "Medical Equipment & Supplies", "Safety Equipment & Protective Gear", "Manufacturing Equipment",
        "Manufacturing Materials & Supplies", "Retail & Store Equipment", "Store Fridges",
        "Stationery & Office Equipment", "Hospital Equipment", "Restaurant & Catering Equipment",
        "Stage & Event Equipment", "Commercial Scales",
    ],
    "sports-and-hobbies": [
        "Personal Mobility", "Sports Equipment", "Massagers", "Musical Instruments & Gear",
        "Books & Table Games", "Gym Equipment", "Arts, Crafts & Awards", "Photo Books",
        "Camping & Outdoors", "Collectibles",
    ],
    "babies-kids": [
        "Toys & Games", "Children's Furniture", "Children's Clothing", "Children's Shoes",
        "Care & Feeding", "Babies & Kids Accessories", "Baby Gear & Equipment", "Children's Dresses",
        "Educational Toys", "Baby Strollers", "Car Seats",
    ],
    "agriculture": [
        "Food & Beverages", "Farm Animals", "Seeds & Fertilizers", "Farm Machinery & Equipment", "Farm Supplies",
    ],
    "animals-and-pets": [
        "Pet's Accessories", "Cats & Kittens", "Dogs & Puppies", "Fish", "Birds", "Farm Animals", "Other Pets",
    ],
    "jobs": [
        "Advertising & Marketing Jobs", "Accounting & Finance Jobs", "Arts & Entertainment Jobs",
        "Childcare & Babysitting Jobs", "Construction & Skilled Trades Jobs", "Customer Service Jobs",
        "Education Jobs", "Engineering Jobs", "Healthcare & Nursing Jobs", "Hospitality & Tourism Jobs",
        "Human Resources Jobs", "IT & Telecommunications Jobs", "Legal Jobs", "Logistics & Transport Jobs",
        "Management Jobs", "Manufacturing Jobs", "Retail Jobs", "Sales Jobs", "Security Jobs",
        "Domestic Work Jobs", "Cleaning Jobs", "Driving Jobs", "Restaurant & Bar Jobs", "Teaching Jobs",
        "Office Jobs", "Business Development Jobs", "Creative Jobs", "Farm Jobs", "Beauty & Wellness Jobs",
        "Real Estate Jobs", "Part-Time Jobs", "Internship Jobs", "Temporary Jobs", "Freelance Jobs",
        "Remote Jobs", "Government Jobs", "Other Jobs",
    ],
    "seeking-work-cvs": [
        "Accounting & Finance CVs", "Advertising & Marketing CVs", "Arts & Entertainment CVs",
        "Childcare & Babysitting CVs", "Construction & Skilled Trades CVs", "Customer Service CVs",
        "Education CVs", "Engineering CVs", "Healthcare & Nursing CVs", "Hospitality & Tourism CVs",
        "Human Resources CVs", "IT & Telecommunications CVs", "Legal CVs", "Logistics & Transport CVs",
        "Management CVs", "Manufacturing CVs", "Retail CVs", "Sales CVs", "Security CVs",
        "Domestic Work CVs", "Cleaning CVs", "Driving CVs", "Restaurant & Bar CVs", "Teaching CVs",
        "Office CVs", "Business Development CVs", "Creative CVs", "Farm Work CVs", "Beauty & Wellness CVs",
        "Real Estate CVs", "Part-Time Work CVs", "Internship CVs", "Temporary Work CVs", "Freelance CVs",
        "Remote Work CVs", "Government Work CVs", "Other CVs",
    ],
    "business-industry": [
        "Business for Sale & Investment", "Import/Export & Logistics", "Wholesale & Bulk",
        "Business Services", "Running Business for Sale", "Investor / Partner Wanted", "Franchise & Dealership",
    ],
}


ALIASES = {
    ("vehicles", "watercraft-boats"): "boats-watercraft",
    ("property", "short-let"): "short-stays",
    ("property", "land-plots-for-rent"): "land-for-rent",
    ("property", "land-plots-for-sale"): "land-for-sale",
    ("property", "event-centres-venues-workstations"): "event-venues-workspaces",
    ("mobile-phones", "accessories-for-phones-tablets"): "phone-accessories",
    ("repair-construction", "building-materials-supplies"): "building-materials",
    ("repair-construction", "plumbing-water-systems"): "plumbing-supplies",
    ("animals-and-pets", "pet-s-accessories"): "pets-accessories",
}


def expand_subcategories(apps, schema_editor):
    Category = apps.get_model("marketplace", "Category")
    SubCategory = apps.get_model("marketplace", "SubCategory")

    for category_slug, names in CATALOG.items():
        category = Category.objects.filter(slug=category_slug).first()
        if category is None:
            continue
        selected_ids = set()
        for order, name in enumerate(names):
            requested_slug = slugify(name)
            alias_slug = ALIASES.get((category_slug, requested_slug))
            query = SubCategory.objects.filter(category=category)
            subcategory = query.filter(slug=requested_slug).first()
            if subcategory is None and alias_slug:
                subcategory = query.filter(slug=alias_slug).first()
            if subcategory is None:
                subcategory = SubCategory.objects.create(
                    category=category,
                    name=name,
                    slug=requested_slug,
                    sort_order=order,
                )
            else:
                subcategory.name = name
                subcategory.sort_order = order
                subcategory.is_active = True
                subcategory.save(update_fields=["name", "sort_order", "is_active", "updated_at"])
            selected_ids.add(subcategory.pk)

        # Keep legacy catalog entries available, but sort them after the Jiji-style options.
        for subcategory in SubCategory.objects.filter(category=category).exclude(pk__in=selected_ids):
            subcategory.sort_order = 500 + subcategory.sort_order
            subcategory.save(update_fields=["sort_order", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("marketplace", "0009_jiji_vehicle_subcategories")]
    operations = [migrations.RunPython(expand_subcategories, migrations.RunPython.noop)]
