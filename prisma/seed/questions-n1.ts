import type { Prisma } from "@prisma/client";

export const n1Questions: Prisma.QuestionCreateManyInput[] = [
  // ============ 文字・語彙 (VOCAB) ============
  {
    exam: "JLPT_N1",
    section: "VOCAB",
    prompt: "「**顕著**」の読み方はどれか。",
    options: [
      { label: "A", text: "けんちょ" },
      { label: "B", text: "けんじゃく" },
      { label: "C", text: "けんちょう" },
      { label: "D", text: "げんちゃく" },
    ],
    correctIndex: 0,
    explanation:
      "「顕著」（けんちょ）＝ rõ ràng, nổi bật. Ví dụ: 顕著な成果 (thành tích nổi bật).",
    source: "Sample N1 Vocab",
    order: 1,
  },
  {
    exam: "JLPT_N1",
    section: "VOCAB",
    prompt: "「**円滑**」の意味として最も適当なものはどれか。",
    options: [
      { label: "A", text: "順調に進む様子" },
      { label: "B", text: "急に止まる様子" },
      { label: "C", text: "複雑に入り組む様子" },
      { label: "D", text: "激しく動く様子" },
    ],
    correctIndex: 0,
    explanation:
      "「円滑」（えんかつ）＝ trôi chảy, suôn sẻ, không trắc trở. Ví dụ: 会議が円滑に進む (cuộc họp diễn ra suôn sẻ).",
    source: "Sample N1 Vocab",
    order: 2,
  },
  {
    exam: "JLPT_N1",
    section: "VOCAB",
    prompt: "「**曖昧**」の意味として最も適当なものはどれか。",
    options: [
      { label: "A", text: "はっきりしない様子" },
      { label: "B", text: "とても明るい様子" },
      { label: "C", text: "静かな様子" },
      { label: "D", text: "危険な様子" },
    ],
    correctIndex: 0,
    explanation:
      "「曖昧」（あいまい）＝ mơ hồ, không rõ ràng. Ví dụ: 曖昧な返事をする (trả lời mập mờ).",
    source: "Sample N1 Vocab",
    order: 3,
  },
  {
    exam: "JLPT_N1",
    section: "VOCAB",
    prompt: "「**遂行**」の意味として最も適当なものはどれか。",
    options: [
      { label: "A", text: "計画や任務を最後までやり遂げること" },
      { label: "B", text: "途中でやめること" },
      { label: "C", text: "先延ばしにすること" },
      { label: "D", text: "やり直すこと" },
    ],
    correctIndex: 0,
    explanation:
      "「遂行」（すいこう）＝ thực hiện đến cùng, hoàn thành nhiệm vụ. Ví dụ: 任務を遂行する (hoàn thành nhiệm vụ).",
    source: "Sample N1 Vocab",
    order: 4,
  },
  {
    exam: "JLPT_N1",
    section: "VOCAB",
    prompt: "「**補う**」の読み方はどれか。",
    options: [
      { label: "A", text: "おぎなう" },
      { label: "B", text: "うたがう" },
      { label: "C", text: "したがう" },
      { label: "D", text: "かなう" },
    ],
    correctIndex: 0,
    explanation:
      "「補う」（おぎなう）＝ bù đắp, bổ sung. Ví dụ: 不足を補う (bù đắp sự thiếu hụt).",
    source: "Sample N1 Vocab",
    order: 5,
  },

  // ============ 文法 (GRAMMAR) ============
  {
    exam: "JLPT_N1",
    section: "GRAMMAR",
    prompt: "彼は責任者である（　）、その決定について何も知らされていなかった。",
    options: [
      { label: "A", text: "にしては" },
      { label: "B", text: "にしても" },
      { label: "C", text: "にかかわらず" },
      { label: "D", text: "にこたえて" },
    ],
    correctIndex: 0,
    explanation:
      "「にしては」＝ xét theo... thì (trái với mong đợi). Dịch: Dù là người phụ trách nhưng anh ta không hề được báo về quyết định đó.",
    source: "Sample N1 Grammar",
    order: 6,
  },
  {
    exam: "JLPT_N1",
    section: "GRAMMAR",
    prompt: "試験に合格できるかどうかは、日頃の努力（　）だ。",
    options: [
      { label: "A", text: "に応じて" },
      { label: "B", text: "次第" },
      { label: "C", text: "に基づいて" },
      { label: "D", text: "を通じて" },
    ],
    correctIndex: 1,
    explanation:
      "「～次第だ」＝ phụ thuộc vào. Dịch: Có đậu kỳ thi hay không phụ thuộc vào nỗ lực hằng ngày.",
    source: "Sample N1 Grammar",
    order: 7,
  },
  {
    exam: "JLPT_N1",
    section: "GRAMMAR",
    prompt: "雨が降ろうが風が吹こうが、予定された行事は（　）。",
    options: [
      { label: "A", text: "中止せざるを得ない" },
      { label: "B", text: "行われるはずがない" },
      { label: "C", text: "決行される" },
      { label: "D", text: "延期されるかもしれない" },
    ],
    correctIndex: 2,
    explanation:
      "「～ようが～まいが」＝ dù có... hay không. Dịch: Dù mưa gió thế nào, sự kiện đã lên kế hoạch vẫn được tiến hành.",
    source: "Sample N1 Grammar",
    order: 8,
  },
  {
    exam: "JLPT_N1",
    section: "GRAMMAR",
    prompt: "あの会社は社員の意見を聞こうとも（　）、改革を強行した。",
    options: [
      { label: "A", text: "せずに" },
      { label: "B", text: "しながら" },
      { label: "C", text: "してみても" },
      { label: "D", text: "されて" },
    ],
    correctIndex: 0,
    explanation:
      "「～しようともせずに」＝ không thèm làm gì cả. Dịch: Công ty đó không thèm lắng nghe ý kiến nhân viên mà cứ thế ép buộc cải cách.",
    source: "Sample N1 Grammar",
    order: 9,
  },
  {
    exam: "JLPT_N1",
    section: "GRAMMAR",
    prompt: "彼の言動は、社会人としてある（　）非常識だ。",
    options: [
      { label: "A", text: "まじき" },
      { label: "B", text: "べき" },
      { label: "C", text: "べからざる" },
      { label: "D", text: "ごとき" },
    ],
    correctIndex: 0,
    explanation:
      "「あるまじき」＝ không nên có, không xứng đáng. Dịch: Lời nói và hành động của anh ta thật vô lý, không xứng là người đi làm.",
    source: "Sample N1 Grammar",
    order: 10,
  },

  // ============ 読解 (READING) ============
  {
    exam: "JLPT_N1",
    section: "READING",
    prompt:
      "次の文章を読んで、筆者の主張として最も適当なものを選びなさい。\n\n「情報があふれる現代では、人は自分の考えを持つ前に他人の意見に流されやすい。しかし、本当に大切なのは、多くの情報を集めることではなく、それを取捨選択する力ではないだろうか。」",
    options: [
      { label: "A", text: "情報量が多いほど判断は正確になる。" },
      { label: "B", text: "情報を選別する能力が重要である。" },
      { label: "C", text: "他人の意見に従うべきである。" },
      { label: "D", text: "情報収集は無駄である。" },
    ],
    correctIndex: 1,
    explanation:
      "筆者は「多くの情報を集めることではなく、それを取捨選択する力」が大切だと述べている → đáp án B (khả năng chọn lọc thông tin quan trọng).",
    source: "Sample N1 Reading",
    order: 11,
  },
  {
    exam: "JLPT_N1",
    section: "READING",
    prompt:
      "次の文章を読んで、空欄に入る最も適当なものを選びなさい。\n\n「長年続いた習慣を変えることは容易ではない。しかし、変化を恐れて（　）いると、周囲の変化に取り残されてしまう。」",
    options: [
      { label: "A", text: "立ち止まって" },
      { label: "B", text: "駆け出して" },
      { label: "C", text: "振り返って" },
      { label: "D", text: "飛び込んで" },
    ],
    correctIndex: 0,
    explanation:
      "「立ち止まる」＝ dừng lại. Dịch: Nhưng nếu cứ đứng yên vì sợ thay đổi thì sẽ bị bỏ lại phía sau.",
    source: "Sample N1 Reading",
    order: 12,
  },
  {
    exam: "JLPT_N1",
    section: "READING",
    prompt:
      "次の文章を読んで、内容と一致するものを選びなさい。\n\n「近年、働き方改革の影響でテレワークを導入する企業が増えている。一方で、対面でのコミュニケーション不足による業務の遅れを懸念する声もある。」",
    options: [
      { label: "A", text: "すべての企業がテレワークを廃止した。" },
      { label: "B", text: "テレワーク導入企業は増加しているが、課題も指摘されている。" },
      { label: "C", text: "テレワークは対面より常に優れている。" },
      { label: "D", text: "働き方改革は失敗に終わった。" },
    ],
    correctIndex: 1,
    explanation:
      "Bài đọc nói doanh nghiệp áp dụng telework tăng NHƯNG có lo ngại về thiếu giao tiếp trực tiếp → đáp án B.",
    source: "Sample N1 Reading",
    order: 13,
  },
  {
    exam: "JLPT_N1",
    section: "READING",
    prompt:
      "次の文章を読んで、筆者が最も伝えたいことを選びなさい。\n\n「失敗を避けるために何もしないよりも、失敗を経験から学びの機会に変えることが成長への近道である。完璧を目指すあまり挑戦をやめてしまっては、本来の可能性を発揮できない。」",
    options: [
      { label: "A", text: "失敗は避けるべきものである。" },
      { label: "B", text: "完璧主義が成功への鍵である。" },
      { label: "C", text: "挑戦と学びが成長につながる。" },
      { label: "D", text: "失敗したら諦めるべきだ。" },
    ],
    correctIndex: 2,
    explanation:
      "筆者は「失敗を学びに変える」「挑戦をやめない」ことが成長の近道だと述べている → đáp án C.",
    source: "Sample N1 Reading",
    order: 14,
  },
  {
    exam: "JLPT_N1",
    section: "READING",
    prompt:
      "次の文章を読んで、空欄に入る最も適当なものを選びなさい。\n\n「日本語の敬語は複雑で難しいと言われるが、相手を尊重する気持ちが（　）ならば、自然と適切な言葉遣いができるようになる。」",
    options: [
      { label: "A", text: "備わっていて" },
      { label: "B", text: "欠けていて" },
      { label: "C", text: "溢れていて" },
      { label: "D", text: "偏っていて" },
    ],
    correctIndex: 0,
    explanation:
      "「備わる」＝ có sẵn, sở hữu. Dịch: Nếu có sẵn tấm lòng tôn trọng đối phương thì tự nhiên sẽ dùng được cách nói phù hợp.",
    source: "Sample N1 Reading",
    order: 15,
  },

  // ============ 聴解 (LISTENING) ============
  {
    exam: "JLPT_N1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n女：田中さん、明日の会議の資料、できましたか。\n男：すみません、まだ半分しかできていません。午後には全部仕上げます。\n女：そうですか。では、夕方までにお願いしますね。\n\n質問：男の人は資料をいつまでに仕上げなければなりませんか。",
    options: [
      { label: "A", text: "明日の朝まで" },
      { label: "B", text: "今日の午後まで" },
      { label: "C", text: "今日の夕方まで" },
      { label: "D", text: "明日の昼まで" },
    ],
    correctIndex: 2,
    explanation:
      "女が「夕方までにお願いしますね」と言っている → hạn chót là chiều nay (đáp án C).",
    source: "Sample N1 Listening",
    order: 16,
  },
  {
    exam: "JLPT_N1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n男：新しいプロジェクトの件ですが、来月から始める予定でしたよね。\n女：ええ、ただ、予算の承認がまだ下りていないので、少し遅れるかもしれません。\n\n質問：プロジェクトはどうなる可能性がありますか。",
    options: [
      { label: "A", text: "来月から必ず始まる" },
      { label: "B", text: "予算が減らされる" },
      { label: "C", text: "開始が遅れるかもしれない" },
      { label: "D", text: "中止になる" },
    ],
    correctIndex: 2,
    explanation:
      "女：「予算の承認がまだ下りていないので、少し遅れるかもしれません」→ có thể bị trễ (đáp án C).",
    source: "Sample N1 Listening",
    order: 17,
  },
  {
    exam: "JLPT_N1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n先生：レポートの提出期限は来週の金曜日です。ただし、体調不良など特別な事情がある場合は、事前に連絡してください。\n\n質問：学生がすべきことは何ですか。",
    options: [
      { label: "A", text: "金曜日に必ず提出する" },
      { label: "B", text: "事情があれば事前に連絡する" },
      { label: "C", text: "レポートを書かない" },
      { label: "D", text: "金曜日に相談に行く" },
    ],
    correctIndex: 1,
    explanation:
      "「特別な事情がある場合は、事前に連絡してください」→ nếu có lý do đặc biệt thì báo trước (đáp án B).",
    source: "Sample N1 Listening",
    order: 18,
  },
  {
    exam: "JLPT_N1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n男：駅前の新しいカフェ、行ったことある？\n女：うん、先週友達と行ったよ。コーヒーは美味しいけど、週末はすごく混んでいて席がなかったんだ。\n\n質問：女の人はカフェについてどう思っていますか。",
    options: [
      { label: "A", text: "コーヒーがまずい" },
      { label: "B", text: "週末は空いている" },
      { label: "C", text: "コーヒーは美味しいが混んでいる" },
      { label: "D", text: "二度と行きたくない" },
    ],
    correctIndex: 2,
    explanation:
      "「コーヒーは美味しいけど、週末はすごく混んでいて席がなかった」→ ngon nhưng đông (đáp án C).",
    source: "Sample N1 Listening",
    order: 19,
  },
  {
    exam: "JLPT_N1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\nアナウンス：本日の午後2時より、地下鉄3号線は工事のため運転を見合わせます。再開は午後5時の見込みです。ご利用のお客様にはご迷惑をおかけします。\n\n質問：地下鉄3号線はどうなりますか。",
    options: [
      { label: "A", text: "午後2時から5時まで運転を休止する" },
      { label: "B", text: "午後2時に運転を再開する" },
      { label: "C", text: "一日中運転する" },
      { label: "D", text: "明日から運転をやめる" },
    ],
    correctIndex: 0,
    explanation:
      "「午後2時より運転を見合わせます。再開は午後5時の見込み」→ tạm ngừng từ 2h đến khoảng 5h (đáp án A).",
    source: "Sample N1 Listening",
    order: 20,
  },
];