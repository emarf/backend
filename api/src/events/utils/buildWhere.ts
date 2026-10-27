export const buildWhere = ({
  category,
  city,
  minPrice
}: Partial<{
  category: string;
  city: string;
  minPrice: number;
}>) => {
  const values = [];
  const conditions = [];
  if (category !== undefined) {
    values.push(category);
    conditions.push(`e.category = $${values.length}`);
  }

  if (city !== undefined) {
    values.push(city);
    conditions.push(`v.city = $${values.length}`);
  }

  if (minPrice !== undefined) {
    values.push(minPrice);
    conditions.push(`e.base_price >= $${values.length}`);
  }

  return {
    values,
    where: conditions.length > 0 ? `where ${conditions.join(" and ")}` : ""
  };
};
