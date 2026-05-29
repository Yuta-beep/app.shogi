/**
 * tutorial.html と同じ画像アセット（app.shogi/assets/tutorial/ に配置）
 */
export const tutorialAssets = {
  background: require('../../assets/tutorial/チュートリアル背景.png'),
  character: require('../../assets/tutorial/メインキャラクター1.png'),
  bubble: require('../../assets/tutorial/チュートリアル吹き出し.png'),
  buttons: {
    next: require('../../assets/tutorial/次へ.png'),
    prev: require('../../assets/tutorial/戻る.png'),
  },
  overlays: {
    board: require('../../assets/tutorial/将棋盤.png'),
    stage: require('../../assets/tutorial/チュートリアルステージ.jpg'),
    light: require('../../assets/tutorial/チュートリアル光.jpg'),
    specialSquare: require('../../assets/tutorial/チュートリアル特殊マス.png'),
    ukanmuri: require('../../assets/tutorial/うかんむりガチャ.png'),
    gacha: require('../../assets/tutorial/チュートリアルガチャ.png'),
    gachaBall: require('../../assets/tutorial/ガチャ玉青.png'),
    shop: require('../../assets/tutorial/チュートリアル駒ショップ.jpg'),
    currency: require('../../assets/tutorial/通貨.jpg'),
    deckbuilder: require('../../assets/tutorial/チュートリアルデッキビルダー.jpg'),
    cost: require('../../assets/tutorial/チュートリアルコスト.jpg'),
    book: require('../../assets/tutorial/チュートリアル駒図鑑.jpg'),
    versus: require('../../assets/tutorial/対人対戦.png'),
  },
} as const;
