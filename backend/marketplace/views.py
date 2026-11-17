from django.db.models import Count, F, Prefetch, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Advertisement, AdvertisementImage, Category, County, Favorite, Promotion, SubCategory, Town
from .permissions import IsOwnerOrActiveReadOnly, IsStaffOrReadOnly
from .serializers import AdvertisementImageSerializer, AdvertisementSerializer, CategorySerializer, CountySerializer, TownSerializer


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]
    def get_queryset(self):
        active_ads = Q(advertisements__status=Advertisement.Status.ACTIVE)
        subcategories = SubCategory.objects.annotate(active_ad_count=Count("advertisements", filter=Q(advertisements__status=Advertisement.Status.ACTIVE)))
        if self.request.user.is_staff:
            return Category.objects.annotate(active_ad_count=Count("advertisements", filter=active_ads)).prefetch_related(Prefetch("subcategories", queryset=subcategories))
        return Category.objects.filter(is_active=True).annotate(active_ad_count=Count("advertisements", filter=active_ads)).prefetch_related(Prefetch("subcategories", queryset=subcategories.filter(is_active=True)))

class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"
    queryset = Category.objects.prefetch_related("subcategories")
    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset
        return Category.objects.filter(is_active=True).prefetch_related(Prefetch("subcategories", queryset=SubCategory.objects.filter(is_active=True)))
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

class CountyListView(generics.ListAPIView):
    serializer_class = CountySerializer
    permission_classes = [permissions.AllowAny]
    queryset = County.objects.filter(is_active=True)

class TownListView(generics.ListAPIView):
    serializer_class = TownSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        queryset = Town.objects.filter(is_active=True, county__is_active=True).select_related("county")
        county = self.request.query_params.get("county")
        if county:
            queryset = queryset.filter(county__slug=county)
        return queryset

class AdvertisementListCreateView(generics.ListCreateAPIView):
    serializer_class = AdvertisementSerializer
    permission_classes = [IsOwnerOrActiveReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    def get_queryset(self):
        queryset = Advertisement.objects.select_related("seller", "seller__seller_profile", "category", "subcategory", "county", "town", "town__county").prefetch_related("images").filter(status=Advertisement.Status.ACTIVE)
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category, category__is_active=True)
        subcategory = self.request.query_params.get("subcategory")
        if subcategory:
            queryset = queryset.filter(subcategory__slug=subcategory, subcategory__is_active=True)
        search = self.request.query_params.get("q", "").strip()
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search) | Q(category__name__icontains=search) | Q(subcategory__name__icontains=search) | Q(country__icontains=search) | Q(region__icontains=search) | Q(city__icontains=search) | Q(county__name__icontains=search) | Q(town__name__icontains=search))
        country = self.request.query_params.get("country", "").strip()
        if country:
            queryset = queryset.filter(country__iexact=country)
        county = self.request.query_params.get("county")
        if county:
            queryset = queryset.filter(county__slug=county, county__is_active=True)
        town = self.request.query_params.get("town")
        if town:
            queryset = queryset.filter(Q(town__slug=town, town__is_active=True) | Q(city__icontains=town) | Q(region__icontains=town))
        condition = self.request.query_params.get("condition")
        if condition in Advertisement.Condition.values:
            queryset = queryset.filter(condition=condition)
        currency = self.request.query_params.get("currency")
        if currency and len(currency) == 3 and currency.isalpha():
            queryset = queryset.filter(currency=currency.upper())
        minimum = self.request.query_params.get("min_price")
        maximum = self.request.query_params.get("max_price")
        try:
            if minimum not in (None, "") and float(minimum) >= 0:
                queryset = queryset.filter(price__gte=minimum)
            if maximum not in (None, "") and float(maximum) >= 0:
                queryset = queryset.filter(price__lte=maximum)
        except (ValueError, TypeError):
            pass
        ordering = self.request.query_params.get("ordering")
        if ordering in ("price", "-price", "created_at", "-created_at"):
            queryset = queryset.order_by(ordering, "-id")
        return queryset


class FavoriteListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        ads = Advertisement.objects.filter(favorited_by__user=request.user, status=Advertisement.Status.ACTIVE).select_related("seller", "seller__seller_profile", "category", "subcategory", "county", "town").prefetch_related("images")
        return Response(AdvertisementSerializer(ads, many=True, context={"request": request}).data)
    def post(self, request):
        slug = request.data.get("advertisement_slug", "")
        ad = get_object_or_404(Advertisement, slug=slug, status=Advertisement.Status.ACTIVE)
        Favorite.objects.get_or_create(user=request.user, advertisement=ad)
        return Response({"saved": True}, status=status.HTTP_201_CREATED)


class FavoriteDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def delete(self, request, slug):
        Favorite.objects.filter(user=request.user, advertisement__slug=slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class PopularAdvertisementListView(generics.ListAPIView):
    serializer_class = AdvertisementSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    def get_queryset(self):
        return Advertisement.objects.filter(status=Advertisement.Status.ACTIVE).select_related("seller", "seller__seller_profile", "category", "subcategory", "county", "town").prefetch_related("images").order_by("-views_count", "-created_at")[:8]

class PromotedAdvertisementListView(generics.ListAPIView):
    serializer_class = AdvertisementSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    def get_queryset(self):
        now = timezone.now()
        promoted_ids = Promotion.objects.filter(status=Promotion.Status.ACTIVE, starts_at__lte=now, ends_at__gt=now, advertisement__status=Advertisement.Status.ACTIVE).order_by("-created_at").values_list("advertisement_id", flat=True)[:8]
        return Advertisement.objects.filter(id__in=promoted_ids).select_related("seller", "seller__seller_profile", "category", "subcategory", "county", "town").prefetch_related("images")

class MyAdvertisementsView(generics.ListAPIView):
    serializer_class = AdvertisementSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Advertisement.objects.filter(seller=self.request.user).select_related("seller", "seller__seller_profile", "category", "subcategory", "county", "town", "town__county").prefetch_related("images")

class AdvertisementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdvertisementSerializer
    permission_classes = [IsOwnerOrActiveReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "slug"
    queryset = Advertisement.objects.select_related("seller", "seller__seller_profile", "category", "subcategory", "county", "town", "town__county").prefetch_related("images")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == Advertisement.Status.ACTIVE:
            Advertisement.objects.filter(pk=instance.pk).update(views_count=F("views_count") + 1)
            instance.refresh_from_db(fields=["views_count"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    def perform_destroy(self, instance):
        for image in instance.images.all():
            image.image.delete(save=False)
        instance.delete()

class MarkAdvertisementSoldView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, slug):
        advertisement = get_object_or_404(Advertisement, slug=slug, seller=request.user)
        if advertisement.status not in [Advertisement.Status.ACTIVE, Advertisement.Status.PENDING]:
            return Response({"detail": "Only pending or active advertisements can be marked sold."}, status=status.HTTP_400_BAD_REQUEST)
        advertisement.status = Advertisement.Status.SOLD
        advertisement.save(update_fields=["status", "updated_at"])
        return Response(AdvertisementSerializer(advertisement, context={"request": request}).data)

class AdvertisementImageDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def delete(self, request, slug, image_id):
        ad = get_object_or_404(Advertisement, slug=slug, seller=request.user)
        image = get_object_or_404(AdvertisementImage, advertisement=ad, id=image_id)
        image.image.delete(save=False)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
