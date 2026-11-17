from django.urls import path
from .admin_views import ReportCreateView
from .chat_views import ConversationListCreateView, ConversationMessagesView
from .views import AdvertisementDetailView, AdvertisementImageDeleteView, AdvertisementListCreateView, CategoryDetailView, CategoryListCreateView, CountyListView, FavoriteDetailView, FavoriteListCreateView, MarkAdvertisementSoldView, MyAdvertisementsView, PopularAdvertisementListView, PromotedAdvertisementListView, TownListView

urlpatterns = [
    path("messages/conversations/", ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("messages/conversations/<int:conversation_id>/messages/", ConversationMessagesView.as_view(), name="conversation-messages"),
    path("categories/", CategoryListCreateView.as_view(), name="category-list"),
    path("categories/<slug:slug>/", CategoryDetailView.as_view(), name="category-detail"),
    path("counties/", CountyListView.as_view(), name="county-list"),
    path("towns/", TownListView.as_view(), name="town-list"),
    path("reports/", ReportCreateView.as_view(), name="report-create"),
    path("favorites/", FavoriteListCreateView.as_view(), name="favorite-list-create"),
    path("favorites/<slug:slug>/", FavoriteDetailView.as_view(), name="favorite-detail"),
    path("advertisements/", AdvertisementListCreateView.as_view(), name="advertisement-list"),
    path("advertisements/popular/", PopularAdvertisementListView.as_view(), name="popular-advertisements"),
    path("advertisements/promoted/", PromotedAdvertisementListView.as_view(), name="promoted-advertisements"),
    path("advertisements/mine/", MyAdvertisementsView.as_view(), name="my-advertisements"),
    path("advertisements/<slug:slug>/", AdvertisementDetailView.as_view(), name="advertisement-detail"),
    path("advertisements/<slug:slug>/sold/", MarkAdvertisementSoldView.as_view(), name="advertisement-sold"),
    path("advertisements/<slug:slug>/images/<int:image_id>/", AdvertisementImageDeleteView.as_view(), name="advertisement-image-delete"),
]
