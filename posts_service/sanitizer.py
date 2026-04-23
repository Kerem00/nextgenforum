import re
import emoji


def ml_preprocess(text: str, model_type: str) -> str:
    """
    Sanitize input text before feeding it to an ML model.

    Args:
        text: The raw text to sanitize.
        model_type: One of 'featureunion' (for Logistic Regression pipeline)
                     or 'fasttext' (for FastText model).

    Returns:
        The sanitized text string.
    """
    if text is None or (isinstance(text, float)):
        return ""
    text = str(text)

    # Format newlines to spaces
    text = text.replace('\n', ' ')

    # STEP 1: All models — strip HTML, normalise whitespace, replace URLs & emails
    text = re.sub(r'<[^<]+?>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    url_pattern = re.compile(
        r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    )
    text = url_pattern.sub('URLTOKEN', text)

    email_pattern = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    )
    text = email_pattern.sub('EMAILTOKEN', text)

    # STEP 2: featureunion & fasttext — lowercase, demojize, combine chars, truncate repeats
    text = text.lower()
    text = emoji.demojize(text, delimiters=(" ", " "))
    text = re.sub(r'\s+', ' ', text).strip()

    # Combine 3 or more isolated characters
    text = re.sub(
        r'(?<!\S)(\S)(?: \S){2,}(?!\S)',
        lambda match: match.group(0).replace(' ', ''),
        text,
    )

    # Truncate character repetitions > 2
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)

    if model_type == 'featureunion':
        return text

    # STEP 3: fasttext only — pad ! and ?, remove other non-sandwiched punctuation
    text = re.sub(r'(?<![a-zA-Z0-9])([!?])|([!?])(?![a-zA-Z0-9])', r' \1\2 ', text)
    text = re.sub(r'(?<![a-zA-Z0-9])[^\w\s!?]|[^\w\s!?](?![a-zA-Z0-9])', '', text)
    text = re.sub(r'\s+', ' ', text).strip()

    return text
