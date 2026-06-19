import { StampSetTemplate } from '../types';
import { COLOR_VERMILLION, COLOR_RED, COLOR_BLUE, COLOR_GREEN, COLOR_BLACK, getTodayString } from './defaultTemplates';

export function createDefaultStampSets(): StampSetTemplate[] {
  const today = getTodayString();

  return [
    {
      id: 'set-sama-thanks',
      name: '💌 宛名「様」＆感謝の言葉セット',
      isBuiltIn: true,
      items: [
        {
          type: 'text',
          text: '様',
          textColor: COLOR_BLACK,
          borderColor: 'transparent',
          fontFamily: 'Noto Serif JP',
          hasBorder: false,
          width: 45,
          height: 45,
          opacity: 0.95,
          x: 18,
          y: 20,
          rotation: 0
        },
        {
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
          x: 18,
          y: 40,
          rotation: 0
        }
      ]
    },
    {
      id: 'set-confidential-approved',
      name: '🔒 社外秘＆承認検印セット',
      isBuiltIn: true,
      items: [
        {
          type: 'square_seal',
          text: '社外秘',
          textColor: COLOR_RED,
          borderColor: COLOR_RED,
          fontFamily: 'Noto Serif JP',
          hasBorder: true,
          isDoubleBorder: true,
          width: 55,
          height: 55,
          opacity: 0.95,
          x: 82,
          y: 6,
          rotation: 0
        },
        {
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
          x: 80,
          y: 84,
          rotation: 0
        }
      ]
    },
    {
      id: 'set-triple-approval',
      name: '👥 トリプル回覧決裁印',
      isBuiltIn: true,
      items: [
        {
          type: 'round_seal',
          text: '部長',
          textColor: COLOR_VERMILLION,
          borderColor: COLOR_VERMILLION,
          fontFamily: 'Noto Serif JP',
          hasBorder: true,
          width: 45,
          height: 45,
          opacity: 0.9,
          x: 65,
          y: 86,
          rotation: 0
        },
        {
          type: 'round_seal',
          text: '課長',
          textColor: COLOR_VERMILLION,
          borderColor: COLOR_VERMILLION,
          fontFamily: 'Noto Serif JP',
          hasBorder: true,
          width: 45,
          height: 45,
          opacity: 0.9,
          x: 74,
          y: 86,
          rotation: 0
        },
        {
          type: 'round_seal',
          text: '担当',
          textColor: COLOR_VERMILLION,
          borderColor: COLOR_VERMILLION,
          fontFamily: 'Noto Serif JP',
          hasBorder: true,
          width: 45,
          height: 45,
          opacity: 0.9,
          x: 83,
          y: 86,
          rotation: 0
        }
      ]
    },
    {
      id: 'set-invoice-checklist',
      name: '📝 請求書・確認チェックセット',
      isBuiltIn: true,
      items: [
        {
          type: 'text',
          text: '確認済',
          textColor: COLOR_GREEN,
          borderColor: COLOR_GREEN,
          fontFamily: 'Noto Sans JP',
          hasBorder: true,
          width: 90,
          height: 38,
          opacity: 0.9,
          x: 70,
          y: 12,
          rotation: 0
        },
        {
          type: 'checkmark',
          textColor: COLOR_GREEN,
          borderColor: COLOR_GREEN,
          fontFamily: 'sans-serif',
          hasBorder: false,
          width: 32,
          height: 32,
          opacity: 1.0,
          x: 62,
          y: 12.5,
          rotation: 0
        },
        {
          type: 'text',
          text: '支払処理済',
          textColor: COLOR_BLUE,
          borderColor: COLOR_BLUE,
          fontFamily: 'Noto Sans JP',
          hasBorder: true,
          isDoubleBorder: true,
          width: 110,
          height: 38,
          opacity: 0.9,
          x: 70,
          y: 20,
          rotation: 0
        },
        {
          type: 'checkmark',
          textColor: COLOR_BLUE,
          borderColor: COLOR_BLUE,
          fontFamily: 'sans-serif',
          hasBorder: false,
          width: 32,
          height: 32,
          opacity: 1.0,
          x: 62,
          y: 20.5,
          rotation: 0
        }
      ]
    }
  ];
}
