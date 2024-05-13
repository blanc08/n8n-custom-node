// Regexps involved with splitting words in various case formats.
const SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
const SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;

// The default characters to keep after transforming case.
const DEFAULT_PREFIX_SUFFIX_CHARACTERS = '';

// Regexp involved with stripping non-word characters from the result.
const DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;

// The replacement value for splits.
const SPLIT_REPLACE_VALUE = '$1\0$2';

/**
 * Supported locale values. Use `false` to ignore locale.
 * Defaults to `undefined`, which uses the host environment.
 */
export type Locale = string[] | string | false | undefined;

export interface Options {
	locale?: Locale;
	split?: (value: string) => string[];
	/** @deprecated Pass `split: splitSeparateNumbers` instead. */
	separateNumbers?: boolean;
	delimiter?: string;
	prefixCharacters?: string;
	suffixCharacters?: string;
}

/**
 * Split any cased input strings into an array of words.
 */
export function split(value: string) {
	let result = value.trim();

	result = result
		.replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE)
		.replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);

	result = result.replace(DEFAULT_STRIP_REGEXP, '\0');

	let start = 0;
	let end = result.length;

	// Trim the delimiter from around the output string.
	while (result.charAt(start) === '\0') start++;
	if (start === end) return [];
	while (result.charAt(end - 1) === '\0') end--;

	return result.slice(start, end).split(/\0/g);
}

function splitPrefixSuffix(input: string, options: Options = {}): [string, string[], string] {
	const splitFn = options.split ?? split;
	const prefixCharacters = options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
	const suffixCharacters = options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
	let prefixIndex = 0;
	let suffixIndex = input.length;

	while (prefixIndex < input.length) {
		const char = input.charAt(prefixIndex);
		if (!prefixCharacters.includes(char)) break;
		prefixIndex++;
	}

	while (suffixIndex > prefixIndex) {
		const index = suffixIndex - 1;
		const char = input.charAt(index);
		if (!suffixCharacters.includes(char)) break;
		suffixIndex = index;
	}

	return [
		input.slice(0, prefixIndex),
		splitFn(input.slice(prefixIndex, suffixIndex)),
		input.slice(suffixIndex),
	];
}

/**
 * Convert a string to space separated lower case (`foo bar`).
 */
export function noCase(input: string, options?: Options) {
	const [prefix, words, suffix] = splitPrefixSuffix(input, options);
	return prefix + words.map(lowerFactory(options?.locale)).join(options?.delimiter ?? ' ') + suffix;
}

function lowerFactory(locale: Locale): (input: string) => string {
	return locale === false
		? (input: string) => input.toLowerCase()
		: (input: string) => input.toLocaleLowerCase(locale);
}

/**
 * Convert a string to snake case (`foo_bar`).
 */
export function snakeCase(input: string, options?: Options) {
	return noCase(input, { delimiter: '_', ...options });
}
