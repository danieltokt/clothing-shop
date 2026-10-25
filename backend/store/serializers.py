from django.db import transaction
from rest_framework import serializers

from .models import Category, Order, OrderItem, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    sizes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "description", "price", "image_url", "sizes", "category"]

    def get_sizes(self, obj):
        return obj.size_list()


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    size = serializers.CharField(max_length=10)
    quantity = serializers.IntegerField(min_value=1, max_value=20)


class OrderCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=30)
    address = serializers.CharField(max_length=255)
    items = OrderItemInputSerializer(many=True, allow_empty=False)

    def create(self, validated_data):
        with transaction.atomic():
            order = Order.objects.create(
                name=validated_data["name"],
                phone=validated_data["phone"],
                address=validated_data["address"],
            )
            total = 0
            for item in validated_data["items"]:
                try:
                    product = Product.objects.get(pk=item["product_id"], is_active=True)
                except Product.DoesNotExist:
                    raise serializers.ValidationError(
                        {"items": f"Товар {item['product_id']} не найден"}
                    )
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    size=item["size"],
                    quantity=item["quantity"],
                    price=product.price,
                )
                total += product.price * item["quantity"]
            order.total = total
            order.save(update_fields=["total"])
        return order