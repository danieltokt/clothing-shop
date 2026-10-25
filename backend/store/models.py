from django.db import models


class Category(models.Model):
    name = models.CharField("Название", max_length=100)
    slug = models.SlugField("Слаг", unique=True)

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products", verbose_name="Категория"
    )
    name = models.CharField("Название", max_length=150)
    description = models.TextField("Описание", blank=True)
    price = models.DecimalField("Цена", max_digits=10, decimal_places=2)
    image_url = models.URLField("Ссылка на фото", max_length=500)
    sizes = models.CharField("Размеры (через запятую)", max_length=100, default="S,M,L,XL")
    is_active = models.BooleanField("Показывать", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def size_list(self):
        return [s.strip() for s in self.sizes.split(",") if s.strip()]


class Order(models.Model):
    name = models.CharField("Имя", max_length=100)
    phone = models.CharField("Телефон", max_length=30)
    address = models.CharField("Адрес", max_length=255)
    total = models.DecimalField("Сумма", max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField("Создан", auto_now_add=True)

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Заказ №{self.pk} — {self.name}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField("Товар", max_length=150)
    size = models.CharField("Размер", max_length=10)
    quantity = models.PositiveIntegerField("Кол-во", default=1)
    price = models.DecimalField("Цена", max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} ({self.size}) x{self.quantity}"