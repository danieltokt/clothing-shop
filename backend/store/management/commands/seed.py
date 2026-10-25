from django.core.management.base import BaseCommand

from store.models import Category, Product

DATA = {
    ("Футболки", "tshirts"): [
        ("Базовая футболка", 2490),
        ("Оверсайз футболка", 2990),
        ("Лонгслив", 3490),
    ],
    ("Худи", "hoodies"): [
        ("Худи классическое", 5990),
        ("Свитшот", 4990),
        ("Худи на молнии", 6490),
    ],
    ("Брюки", "pants"): [
        ("Брюки прямого кроя", 5490),
        ("Джоггеры", 4490),
        ("Карго", 5990),
    ],
}


class Command(BaseCommand):
    help = "Добавляет демо-товары, если база пустая"

    def handle(self, *args, **options):
        if Product.objects.exists():
            self.stdout.write("Товары уже есть, пропускаю")
            return
        n = 0
        for (cat_name, slug), items in DATA.items():
            category, _ = Category.objects.get_or_create(slug=slug, defaults={"name": cat_name})
            for title, price in items:
                n += 1
                Product.objects.create(
                    category=category,
                    name=title,
                    description="Плотный хлопок, свободная посадка, минималистичный дизайн.",
                    price=price,
                    image_url=f"https://picsum.photos/seed/shop{n}/600/800",
                )
        self.stdout.write(self.style.SUCCESS(f"Добавлено товаров: {n}"))