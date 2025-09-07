
interface TextStyles {
  fontFamily: string;
  fontSize: number;
  padding?: number;
}

const measureText = (text: string, styles: TextStyles) => {
  const span = document.createElement('span');
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'pre-wrap';
  span.style.wordBreak = 'break-word';
  span.style.fontFamily = styles.fontFamily;
  span.style.fontSize = `${styles.fontSize}px`;
  span.style.padding = `${styles.padding || 0}px`;
  span.textContent = text;

  document.body.appendChild(span);

  const width = span.offsetWidth;
  const height = span.offsetHeight;

  document.body.removeChild(span);

  return { width, height };
};

export default measureText;
