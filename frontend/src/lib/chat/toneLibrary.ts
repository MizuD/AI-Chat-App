import type { Emotion, Tone } from "@/lib/character/types";

interface ToneRule {
  keywords: string[];
  emotion: Emotion;
  replies: Record<Tone, string[]>;
}

export const TONE_LABELS: Record<Tone, { label: string; description: string }> = {
  casual: { label: "フランク", description: "気心の知れた友達" },
  cheerful: { label: "元気", description: "明るく人懐っこい" },
  cool: { label: "クール", description: "落ち着いていて淡々" },
  gentle: { label: "ていねい", description: "穏やかで包み込むよう" },
  tsundere: { label: "ツンデレ", description: "素直になれない照れ屋" },
};

export const TONE_RULES: ToneRule[] = [
  {
    keywords: ["こんにちは", "こんばんは", "おはよう", "やあ", "もしもし", "はじめまして", "hello", "hi"],
    emotion: "happy",
    replies: {
      casual: ["おー、やっほー！元気してた？", "よっ！ちょうど話したいと思ってたとこ。"],
      cheerful: ["こんにちは〜！{you}に会えてうれしいな！", "わーい、来てくれたんだ！待ってたよ！"],
      cool: ["……こんにちは。今日も来たんだね。", "やあ。調子はどう？"],
      gentle: ["こんにちは。来てくださってうれしいです。", "ようこそ。ゆっくりしていってくださいね。"],
      tsundere: ["ふ、ふーん、来たんだ。……こんにちは。", "べつに待ってないけど、こんにちは！"],
    },
  },
  {
    keywords: ["名前", "だれ", "誰", "自己紹介"],
    emotion: "happy",
    replies: {
      casual: ["{name}だよ。え、忘れちゃった？（笑）"],
      cheerful: ["{me}は{name}！覚えてくれたらうれしいな！"],
      cool: ["{name}。……一度で覚えて。"],
      gentle: ["{name}と申します。どうぞよろしくお願いしますね。"],
      tsundere: ["{name}よ！ちゃんと覚えなさいよね！"],
    },
  },
  {
    keywords: ["ありがとう", "感謝", "サンキュー", "thanks"],
    emotion: "happy",
    replies: {
      casual: ["いいって、気にしないで！", "おう、どういたしまして！"],
      cheerful: ["えへへ、どういたしまして！", "お礼なんていいよ〜！でもうれしい！"],
      cool: ["……別に。大したことじゃないよ。"],
      gentle: ["どういたしまして。お役に立ててよかったです。"],
      tsundere: ["べ、別に{you}のためにやったんじゃないんだからね！……でも、どういたしまして。"],
    },
  },
  {
    keywords: ["さようなら", "またね", "バイバイ", "おやすみ", "じゃあね", "bye"],
    emotion: "sad",
    replies: {
      casual: ["おう、またね！いつでも連絡してよ。"],
      cheerful: ["えー、もう行っちゃうの？またすぐ来てね！"],
      cool: ["そう。……また話そう。"],
      gentle: ["お疲れさまでした。またいつでも来てくださいね。"],
      tsundere: ["ふん、さっさと行けば？……ちゃんとまた来なさいよ。"],
    },
  },
  {
    keywords: ["疲れ", "つかれ", "眠い", "ねむい", "しんどい"],
    emotion: "sad",
    replies: {
      casual: ["おつかれ！今日はもうゆっくり休みなよ。"],
      cheerful: ["がんばったんだね！えらいえらい！今日は早めに休もう？"],
      cool: ["無理は禁物。休むのも大事だよ。"],
      gentle: ["今日も一日お疲れさまでした。温かいものでも飲んで、ゆっくり休んでくださいね。"],
      tsundere: ["ちょっと、無理しすぎなんじゃないの？……心配なんかしてないけど。"],
    },
  },
  {
    keywords: ["嬉しい", "うれしい", "楽しい", "たのしい", "最高"],
    emotion: "happy",
    replies: {
      casual: ["マジで？よかったじゃん！"],
      cheerful: ["ほんと！？{me}までうれしくなっちゃう！"],
      cool: ["そう。……よかったね。少しだけ、こっちまで楽しくなる。"],
      gentle: ["それはよかったです。{you}が笑顔だと、{me}もうれしいです。"],
      tsundere: ["ふ、ふーん。まあ、よかったんじゃない？"],
    },
  },
  {
    keywords: ["悲しい", "かなしい", "寂しい", "さみしい", "つらい", "辛い"],
    emotion: "sad",
    replies: {
      casual: ["そっか……。話ならいくらでも聞くよ。"],
      cheerful: ["そっか……。{me}がそばにいるよ。いっぱいお話しよう？"],
      cool: ["……話したいなら聞くよ。無理に言わなくてもいいけど。"],
      gentle: ["つらかったですね。ここでは、どんな気持ちも話して大丈夫ですよ。"],
      tsundere: ["な、なによ急に……。し、しょうがないから話くらい聞いてあげる。"],
    },
  },
  {
    keywords: ["好き", "すき", "かわいい", "可愛い", "かっこいい"],
    emotion: "surprised",
    replies: {
      casual: ["え、急にどうした（笑）でもうれしいよ。"],
      cheerful: ["えっ、ほんと！？えへへ、照れちゃうな〜！"],
      cool: ["……不意打ちはずるいな。"],
      gentle: ["まあ……ありがとうございます。少し照れてしまいますね。"],
      tsundere: ["は、はぁ！？い、いきなり何言ってんのよバカ！……うれしくなんか、ないんだから。"],
    },
  },
  {
    keywords: ["何してる", "なにしてる", "趣味", "好きなもの"],
    emotion: "neutral",
    replies: {
      casual: ["んー、特に何も。{you}と話してる方が楽しいし。"],
      cheerful: ["{you}とおしゃべりするのが今いちばんの趣味かも！"],
      cool: ["考えごと。……それと、{you}の話を聞くこと。"],
      gentle: ["お茶を淹れながら、{you}が来るのを待っていました。"],
      tsundere: ["べ、別に何もしてないわよ！{you}を待ってたとかじゃないから！"],
    },
  },
];

export const TONE_FALLBACKS: Record<Tone, string[]> = {
  casual: ["へー、それで？", "わかる、それな。", "マジか。もうちょい詳しく聞かせて。"],
  cheerful: ["へぇ〜！それでそれで？もっと聞かせて！", "なるほど〜！{you}っておもしろいね！", "うんうん！{me}、その話もっと知りたいな！"],
  cool: ["……ふうん。続けて。", "そういう考え方もあるんだね。", "興味深い。もう少し詳しく。"],
  gentle: ["そうだったんですね。お話してくださってありがとうございます。", "うんうん、ゆっくりで大丈夫ですよ。", "{you}のお話、もっと聞かせてください。"],
  tsundere: ["ふーん、で？……べ、別に続きが気になるわけじゃないけど。", "な、なるほどね。まあまあ面白いじゃない。", "しょうがないわね、もう少しだけ聞いてあげる。"],
};

export const SUGGESTIONS = ["もしもし！", "名前を教えて", "最近なにしてる？", "ちょっと疲れた…", "ありがとう"];
