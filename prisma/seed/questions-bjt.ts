import type { Prisma } from "@prisma/client";

export const bjtQuestions: Prisma.QuestionCreateManyInput[] = [
  // ============ 語彙・表現 (BUSINESS_VOCAB) ============
  {
    exam: "BJT_J1",
    section: "BUSINESS_VOCAB",
    prompt: "取引先との会議で「**弊社**」という言葉を使いました。これは何を指しますか。",
    options: [
      { label: "A", text: "相手の会社" },
      { label: "B", text: "自分の会社" },
      { label: "C", text: "第三者の会社" },
      { label: "D", text: "政府機関" },
    ],
    correctIndex: 1,
    explanation:
      "「弊社」（へいしゃ）＝ khiêm nhường chỉ công ty của mình. 「貴社」＝ công ty đối phương.",
    source: "Sample BJT Vocab",
    order: 1,
  },
  {
    exam: "BJT_J1",
    section: "BUSINESS_VOCAB",
    prompt: "部下に「この件は**至急**対応してください」と指示がありました。「至急」の意味はどれか。",
    options: [
      { label: "A", text: "ゆっくりでよい" },
      { label: "B", text: "できるだけ早く" },
      { label: "C", text: "来週までに" },
      { label: "D", text: "必要なら後回し" },
    ],
    correctIndex: 1,
    explanation:
      "「至急」（しきゅう）＝ khẩn cấp, càng sớm càng tốt. Trong kinh doanh thường dùng khi cần xử lý gấp.",
    source: "Sample BJT Vocab",
    order: 2,
  },
  {
    exam: "BJT_J1",
    section: "BUSINESS_VOCAB",
    prompt: "「**ご査収**ください」という表現が使われる場面として最も適当なものはどれか。",
    options: [
      { label: "A", text: "書類を送付する際に、受け取って確認してもらうよう依頼する" },
      { label: "B", text: "商品を注文する際に、値段を尋ねる" },
      { label: "C", text: "退職の挨拶をする際に、感謝を伝える" },
      { label: "D", text: "会議の日程を調整する際に、都合を聞く" },
    ],
    correctIndex: 0,
    explanation:
      "「ご査収ください」＝ kính mong quý vị nhận và kiểm tra (dùng khi gửi tài liệu, hóa đơn...).",
    source: "Sample BJT Vocab",
    order: 3,
  },
  {
    exam: "BJT_J1",
    section: "BUSINESS_VOCAB",
    prompt: "会議で「この件は**保留**にしましょう」と言われました。どういう意味ですか。",
    options: [
      { label: "A", text: "すぐに決定する" },
      { label: "B", text: "決定を先延ばしにする" },
      { label: "C", text: "完全に取り消す" },
      { label: "D", text: "別の人に任せる" },
    ],
    correctIndex: 1,
    explanation:
      "「保留」（ほりゅう）＝ giữ lại, hoãn quyết định. Trong kinh doanh, 「保留にする」 nghĩa là tạm hoãn, chưa quyết định.",
    source: "Sample BJT Vocab",
    order: 4,
  },
  {
    exam: "BJT_J1",
    section: "BUSINESS_VOCAB",
    prompt: "上司：「この企画書、**手直し**しておいて」\n「手直し」の意味として最も適当なものはどれか。",
    options: [
      { label: "A", text: "最初から書き直す" },
      { label: "B", text: "一部を修正する" },
      { label: "C", text: "コピーを取る" },
      { label: "D", text: "破棄する" },
    ],
    correctIndex: 1,
    explanation:
      "「手直し」（てなおし）＝ sửa lại một phần, chỉnh sửa nhẹ. Khác với viết lại từ đầu.",
    source: "Sample BJT Vocab",
    order: 5,
  },

  // ============ 読解 (READING) ============
  {
    exam: "BJT_J1",
    section: "READING",
    prompt:
      "次のメールを読んで、内容と一致するものを選びなさい。\n\n「株式会社サクラ営業部 山田様\n\n平素より大変お世話になっております。株式会社ミドリ商事の鈴木でございます。\n\n先日ご提案いただきました新製品の販売提携について、社内で検討いたしました結果、ぜひお引き受けしたいと考えております。つきましては、来週中に詳細について打ち合わせをさせていただければ幸いです。ご都合のよろしい日時をご連絡ください。\n\n何卒よろしくお願い申し上げます。」",
    options: [
      { label: "A", text: "ミドリ商事は提案を断った" },
      { label: "B", text: "ミドリ商事は提案を受け入れた" },
      { label: "C", text: "サクラは提案を再度送る" },
      { label: "D", text: "鈴木は退職する" },
    ],
    correctIndex: 1,
    explanation:
      "「ぜひお引き受けしたいと考えております」＝ chúng tôi rất muốn nhận lời → đã chấp nhận đề xuất (đáp án B).",
    source: "Sample BJT Reading",
    order: 6,
  },
  {
    exam: "BJT_J1",
    section: "READING",
    prompt:
      "次の案内文を読んで、正しいものを選びなさい。\n\n「【重要】オフィス移転のお知らせ\n\n弊社は業務拡大に伴い、来月1日より下記の住所に事務所を移転いたします。\n新住所：東京都中央区日本橋1-2-3 日本橋ビル5階\n電話番号およびFAX番号は変更ございません。\n\n移転作業のため、今月末の2日間（29日・30日）は電話対応ができません。ご不便をおかけしますが、何卒ご了承ください。」",
    options: [
      { label: "A", text: "電話番号も変わります" },
      { label: "B", text: "移転は来月1日である" },
      { label: "C", text: "29日・30日は通常通り対応する" },
      { label: "D", text: "新住所は大阪である" },
    ],
    correctIndex: 1,
    explanation:
      "「来月1日より…移転いたします」→ ngày 1 tháng sau chuyển văn phòng (đáp án B). Điện thoại KHÔNG đổi, 29-30 không tiếp điện thoại.",
    source: "Sample BJT Reading",
    order: 7,
  },
  {
    exam: "BJT_J1",
    section: "READING",
    prompt:
      "次のグラフに関する説明文を読んで、正しいものを選びなさい。\n\n「当社の今年度の売上は、前期比で8%増加した。特に海外市場での売上が大きく伸び、全体の30%を占めるに至った。一方、国内市場の売上は横ばいが続いている。」",
    options: [
      { label: "A", text: "国内市場の売上が大幅に伸びた" },
      { label: "B", text: "海外市場の売上が全体の3割を占める" },
      { label: "C", text: "売上は前期より減少した" },
      { label: "D", text: "海外市場の売上は横ばいである" },
    ],
    correctIndex: 1,
    explanation:
      "「海外市場での売上が大きく伸び、全体の30%を占める」→ thị trường nước ngoài chiếm 30% tổng doanh thu (đáp án B).",
    source: "Sample BJT Reading",
    order: 8,
  },
  {
    exam: "BJT_J1",
    section: "READING",
    prompt:
      "次の社内通知を読んで、空欄に入る最も適当なものを選びなさい。\n\n「全社員各位\n\n夏季休暇の取得について\n\n今年度の夏季休暇は、7月20日から8月31日の間に（　）5日間を取得することができます。繁忙期の月初を避け、各自の担当業務に支障が出ないよう調整してください。」",
    options: [
      { label: "A", text: "合わせて" },
      { label: "B", text: "かけて" },
      { label: "C", text: "わたって" },
      { label: "D", text: "つけて" },
    ],
    correctIndex: 0,
    explanation:
      "「合わせて5日間」＝ tổng cộng 5 ngày. Dịch: Có thể nghỉ tổng cộng 5 ngày trong khoảng 20/7 – 31/8.",
    source: "Sample BJT Reading",
    order: 9,
  },
  {
    exam: "BJT_J1",
    section: "READING",
    prompt:
      "次のクレーム対応のメールを読んで、送信者の意図として最も適当なものはどれか。\n\n「先日ご購入いただいた製品について、不具合が生じたとのこと、誠に申し訳ございませんでした。原因を調査したところ、製造工程における検査漏れが判明いたしました。つきましては、代替品を本日中に発送いたします。今後このようなことがないよう、品質管理体制を強化してまいります。」",
    options: [
      { label: "A", text: "謝罪し、代替品の発送と再発防止を約束する" },
      { label: "B", text: "購入のキャンセルを求める" },
      { label: "C", text: "原因調査を拒否する" },
      { label: "D", text: "返金のみを案内する" },
    ],
    correctIndex: 0,
    explanation:
      "Nội dung: xin lỗi + gửi hàng thay thế + cam kết tăng cường quản lý chất lượng → đáp án A.",
    source: "Sample BJT Reading",
    order: 10,
  },

  // ============ 聴解 (LISTENING) ============
  {
    exam: "BJT_J1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n受付：お世話になっております。株式会社アオイの佐藤と申します。営業部の山田様はいらっしゃいますか。\n受付係：少々お待ちください。…申し訳ございません。山田はただいま席を外しております。\n佐藤：そうですか。では、折り返しお電話いただけますか。\n\n質問：佐藤さんはどうしますか。",
    options: [
      { label: "A", text: "山田さんを待つ" },
      { label: "B", text: "折り返し電話をもらうよう頼む" },
      { label: "C", text: "また明日来る" },
      { label: "D", text: "他の人に用件を伝える" },
    ],
    correctIndex: 1,
    explanation:
      "佐藤：「折り返しお電話いただけますか」→ nhờ gọi lại (đáp án B).",
    source: "Sample BJT Listening",
    order: 11,
  },
  {
    exam: "BJT_J1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n課長：田中君、先週提出した企画書のことなんだけど。\n田中：はい。\n課長：内容は悪くなかったんだけど、予算の部分が現実的じゃないと思うんだ。もう少し具体的な数字を入れて、来週までに直してきてくれないか。\n\n質問：課長は田中さんに何を求めていますか。",
    options: [
      { label: "A", text: "企画書を破棄する" },
      { label: "B", text: "予算の数字を具体的に修正する" },
      { label: "C", text: "新しい企画を考える" },
      { label: "D", text: "来週プレゼンをする" },
    ],
    correctIndex: 1,
    explanation:
      "「予算の部分が現実的じゃない」「具体的な数字を入れて、来週までに直してきて」→ sửa phần ngân sách cho cụ thể (đáp án B).",
    source: "Sample BJT Listening",
    order: 12,
  },
  {
    exam: "BJT_J1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n取引先：来週の水曜日、御社にうかがって商談をしたいのですが、ご都合はいかがでしょうか。\n鈴木：申し訳ございません。水曜日は終日、外部の会議が入っておりまして。木曜日の午後でしたら可能ですが。\n取引先：では、木曜日の午後2時でいかがでしょう。\n鈴木：承知いたしました。お待ちしております。\n\n質問：商談はいつ行われることになりましたか。",
    options: [
      { label: "A", text: "来週の水曜日" },
      { label: "B", text: "来週の木曜日午後2時" },
      { label: "C", text: "今日の午後2時" },
      { label: "D", text: "再来週の木曜日" },
    ],
    correctIndex: 1,
    explanation:
      "Cuối cùng thống nhất: thứ Năm tuần sau lúc 14:00 (đáp án B).",
    source: "Sample BJT Listening",
    order: 13,
  },
  {
    exam: "BJT_J1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\nアナウンス：本日はご来店ありがとうございます。誠に勝手ながら、本日は棚卸しのため、午後5時に閉店させていただきます。通常は午後8時まで営業しております。ご不便をおかけしますが、何卒ご了承くださいませ。\n\n質問：本日の営業時間はどうなりますか。",
    options: [
      { label: "A", text: "通常通り午後8時まで" },
      { label: "B", text: "午後5時で閉店する" },
      { label: "C", text: "終日休業する" },
      { label: "D", text: "午後8時から営業する" },
    ],
    correctIndex: 1,
    explanation:
      "「棚卸しのため、午後5時に閉店させていただきます」→ hôm nay đóng cửa lúc 17:00 (đáp án B).",
    source: "Sample BJT Listening",
    order: 14,
  },
  {
    exam: "BJT_J1",
    section: "LISTENING",
    prompt:
      "【聴解】（音声の代わりにスクリプトを表示しています）\n\n社長：新製品の発表会ですが、当初の予定では東京で開催する予定でした。しかし、関西圏からの参加希望が多いため、大阪に変更しようと思います。皆さんの意見はどうですか。\n部下：私は賛成です。大阪の方が交通の便も良いですし、参加者が増えると思います。\n\n質問：発表会はどうなりますか。",
    options: [
      { label: "A", text: "東京で開催される" },
      { label: "B", text: "大阪で開催される方向である" },
      { label: "C", text: "中止になる" },
      { label: "D", text: "オンラインのみになる" },
    ],
    correctIndex: 1,
    explanation:
      "社長 đề xuất đổi sang Osaka, nhân viên đồng ý → hướng tới tổ chức tại Osaka (đáp án B).",
    source: "Sample BJT Listening",
    order: 15,
  },
];