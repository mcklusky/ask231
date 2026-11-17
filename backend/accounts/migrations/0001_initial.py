import django.contrib.auth.models
import django.contrib.auth.validators
import django.utils.timezone
from django.db import migrations, models
import django.db.models.deletion
import accounts.models

class Migration(migrations.Migration):
    initial = True
    dependencies = [("auth", "0012_alter_user_first_name_max_length")]
    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False, help_text="Designates that this user has all permissions without explicitly assigning them.", verbose_name="superuser status")),
                ("first_name", models.CharField(blank=True, max_length=150, verbose_name="first name")),
                ("last_name", models.CharField(blank=True, max_length=150, verbose_name="last name")),
                ("is_staff", models.BooleanField(default=False, help_text="Designates whether the user can log into this admin site.", verbose_name="staff status")),
                ("is_active", models.BooleanField(default=True, help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.", verbose_name="active")),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now, verbose_name="date joined")),
                ("email", models.EmailField(db_index=True, max_length=254, unique=True)),
                ("email_verified_at", models.DateTimeField(blank=True, null=True)),
                ("groups", models.ManyToManyField(blank=True, help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.", related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups")),
                ("user_permissions", models.ManyToManyField(blank=True, help_text="Specific permissions for this user.", related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions")),
            ],
            options={"verbose_name": "user", "verbose_name_plural": "users", "abstract": False},
            managers=[("objects", accounts.models.UserManager())],
        ),
        migrations.CreateModel(
            name="SellerProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("business_name", models.CharField(blank=True, max_length=160)),
                ("bio", models.TextField(blank=True)),
                ("is_verified", models.BooleanField(default=False)),
                ("verification_requested_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="seller_profile", to="accounts.user")),
            ],
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone_number", models.CharField(blank=True, max_length=20)),
                ("country_code", models.CharField(default="+231", max_length=4)),
                ("county", models.CharField(blank=True, choices=[("Bomi", "Bomi"), ("Bong", "Bong"), ("Gbarpolu", "Gbarpolu"), ("Grand Bassa", "Grand Bassa"), ("Grand Cape Mount", "Grand Cape Mount"), ("Grand Gedeh", "Grand Gedeh"), ("Grand Kru", "Grand Kru"), ("Lofa", "Lofa"), ("Margibi", "Margibi"), ("Maryland", "Maryland"), ("Montserrado", "Montserrado"), ("Nimba", "Nimba"), ("River Cess", "River Cess"), ("River Gee", "River Gee"), ("Sinoe", "Sinoe")], max_length=40)),
                ("town", models.CharField(blank=True, max_length=100)),
                ("preferred_currency", models.CharField(choices=[("LRD", "Liberian Dollar"), ("USD", "US Dollar")], default="USD", max_length=3)),
                ("avatar_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to="accounts.user")),
            ],
        ),
    ]
