export const applyMargin = (cost, marginPercent) => {
  const marginDecimal = marginPercent / 100;
  const gross = cost * (1 + marginDecimal);
  
  if (gross < 100) {
    const integer = Math.floor(gross);
    const decimal = Math.ceil((gross - integer) * 10);
    return integer + decimal / 10;
  }
  return Math.ceil(gross);
};