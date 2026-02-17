export const renderTemplate = (template: string, data: any): string => {
  return template.replace(/%([a-zA-Z0-9_]+)%/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : '';
  });
};
