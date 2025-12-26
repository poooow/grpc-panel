import { formatForm } from './form';
import { FormattedBody } from './types';

// Re-use formatForm since query strings are URL encoded key-value pairs
export const formatGet = (queryString: string): FormattedBody => {
    return formatForm(queryString);
};
