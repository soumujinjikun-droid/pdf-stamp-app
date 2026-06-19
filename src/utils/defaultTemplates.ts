import { StampTemplate } from '../types';

export const COLOR_VERMILLION = '#e34326'; // Authentic Japanese 朱色
export const COLOR_RED = '#ef4444';
export const COLOR_BLUE = '#1d4ed8';
export const COLOR_GREEN = '#10b981';
export const COLOR_DARK = '#1e293b';
export const COLOR_BLACK = '#000000';

export const getTodayString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${date}`;
};

export function createDefaultTemplates(): StampTemplate[] {
  const today = getTodayString();
  
  return [
    {
      id: 'built-in-sama',
      name: '様',
      type: 'text',
      text: '様',
      textColor: COLOR_BLACK,
      borderColor: 'transparent',
      fontFamily: 'Noto Serif JP',
      hasBorder: false,
      isDoubleBorder: false,
      width: 45,
      height: 45,
      opacity: 0.9,
      isFavorite: true,
      isBuiltIn: true
    },
    {
      id: 'built-in-arigatou',
      name: 'ご注文完了',
      type: 'text',
      text: 'ご注文ありがとうございました。',
      textColor: COLOR_VERMILLION,
      borderColor: COLOR_VERMILLION,
      fontFamily: 'Noto Sans JP',
      hasBorder: true,
      isDoubleBorder: true,
      width: 200,
      height: 45,
      opacity: 0.9,
      isFavorite: true,
      isBuiltIn: true
    },
    {
      id: 'built-in-kakunin',
      name: '確認済',
      type: 'text',
      text: '確認済',
      textColor: COLOR_GREEN,
      borderColor: COLOR_GREEN,
      fontFamily: 'Noto Sans JP',
      hasBorder: true,
      isDoubleBorder: false,
      width: 90,
      height: 38,
      opacity: 0.9,
      isFavorite: true,
      isBuiltIn: true
    },
    {
      id: 'built-in-shounin',
      name: '承認印',
      type: 'round_seal',
      text: '承認',
      textColor: COLOR_VERMILLION,
      borderColor: COLOR_VERMILLION,
      fontFamily: 'Noto Serif JP',
      hasBorder: true,
      isDoubleBorder: false,
      width: 50,
      height: 50,
      opacity: 0.95,
      isFavorite: true,
      isBuiltIn: true
    },
    {
      id: 'built-in-sumi',
      name: '済',
      type: 'round_seal',
      text: '済',
      textColor: COLOR_BLUE,
      borderColor: COLOR_BLUE,
      fontFamily: 'Noto Serif JP',
      hasBorder: true,
      isDoubleBorder: false,
      width: 40,
      height: 40,
      opacity: 0.9,
      isFavorite: false,
      isBuiltIn: true
    },
    {
      id: 'built-in-date',
      name: 'データー日付印',
      type: 'date_seal',
      text: today,
      subText: '検印',
      textColor: COLOR_VERMILLION,
      borderColor: COLOR_VERMILLION,
      fontFamily: 'Noto Sans JP',
      hasBorder: true,
      width: 75,
      height: 75,
      opacity: 0.95,
      isFavorite: true,
      isBuiltIn: true
    },
    {
      id: 'built-in-checkmark',
      name: 'チェックマーク',
      type: 'checkmark',
      textColor: COLOR_GREEN,
      borderColor: COLOR_GREEN,
      fontFamily: 'sans-serif',
      hasBorder: false,
      width: 35,
      height: 35,
      opacity: 1.0,
      isFavorite: true,
      isBuiltIn: true
    },
    {
      id: 'built-in-shugaihisu',
      name: '社外秘',
      type: 'square_seal',
      text: '社外秘',
      textColor: COLOR_RED,
      borderColor: COLOR_RED,
      fontFamily: 'Noto Serif JP',
      hasBorder: true,
      isDoubleBorder: true,
      width: 60,
      height: 60,
      opacity: 0.95,
      isFavorite: false,
      isBuiltIn: true
    }
  ];
}
