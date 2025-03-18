export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const optionsDate: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  return date.toLocaleDateString("en-GB", optionsDate);
};
