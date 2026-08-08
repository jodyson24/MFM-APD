import { format, parseISO } from 'date-fns';

export const formatDate = (iso) => format(parseISO(iso), 'PPP');
export const formatDateTime = (iso) => format(parseISO(iso), 'PPp');
export const toISO = (date) => date.toISOString();