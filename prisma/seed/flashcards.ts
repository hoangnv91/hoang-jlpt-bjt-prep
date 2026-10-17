import type { Prisma } from "@prisma/client";

export const n1Flashcards: Prisma.FlashcardCreateManyInput[] = [
  { exam: "JLPT_N1", term: "顕著", reading: "けんちょ", meaning: "rõ ràng, nổi bật", example: "顕著な成果を上げる", exampleTranslation: "đạt được thành tích nổi bật" },
  { exam: "JLPT_N1", term: "円滑", reading: "えんかつ", meaning: "trôi chảy, suôn sẻ", example: "会議が円滑に進む", exampleTranslation: "cuộc họp diễn ra suôn sẻ" },
  { exam: "JLPT_N1", term: "曖昧", reading: "あいまい", meaning: "mơ hồ, không rõ ràng", example: "曖昧な返事をする", exampleTranslation: "trả lời mập mờ" },
  { exam: "JLPT_N1", term: "遂行", reading: "すいこう", meaning: "thực hiện đến cùng", example: "任務を遂行する", exampleTranslation: "hoàn thành nhiệm vụ" },
  { exam: "JLPT_N1", term: "補う", reading: "おぎなう", meaning: "bù đắp, bổ sung", example: "不足を補う", exampleTranslation: "bù đắp sự thiếu hụt" },
  { exam: "JLPT_N1", term: "僅か", reading: "わずか", meaning: "chút ít, hiếm hoi", example: "僅かな差で勝つ", exampleTranslation: "thắng với cách biệt nhỏ" },
  { exam: "JLPT_N1", term: "促す", reading: "うながす", meaning: "thúc giục, giục giã", example: "返事を促す", exampleTranslation: "thúc giục trả lời" },
  { exam: "JLPT_N1", term: "簡潔", reading: "かんけつ", meaning: "ngắn gọn, súc tích", example: "簡潔に説明する", exampleTranslation: "giải thích ngắn gọn" },
  { exam: "JLPT_N1", term: "頻繁", reading: "ひんぱん", meaning: "thường xuyên, dày đặc", example: "頻繁に連絡を取り合う", exampleTranslation: "liên lạc thường xuyên" },
  { exam: "JLPT_N1", term: "堅実", reading: "けんじつ", meaning: "vững chắc, chắc chắn", example: "堅実な経営方針", exampleTranslation: "chính sách quản lý vững chắc" },
  { exam: "JLPT_N1", term: "疎か", reading: "おろそか", meaning: "qua loa, cẩu thả", example: "勉強をおろそかにする", exampleTranslation: "lơ là việc học" },
  { exam: "JLPT_N1", term: "妥当", reading: "だとう", meaning: "hợp lý, thỏa đáng", example: "妥当な判断", exampleTranslation: "phán đoán hợp lý" },
  { exam: "JLPT_N1", term: "貫く", reading: "つらぬく", meaning: "kiên trì, xuyên suốt", example: "信念を貫く", exampleTranslation: "kiên trì niềm tin" },
  { exam: "JLPT_N1", term: "顕在化", reading: "けんざいか", meaning: "bộc lộ ra, hiện hữu", example: "問題が顕在化する", exampleTranslation: "vấn đề bộc lộ ra" },
  { exam: "JLPT_N1", term: "抑制", reading: "よくせい", meaning: "kiềm chế, ức chế", example: "感情を抑制する", exampleTranslation: "kiềm chế cảm xúc" },
];

export const bjtFlashcards: Prisma.FlashcardCreateManyInput[] = [
  { exam: "BJT_J1", term: "弊社", reading: "へいしゃ", meaning: "công ty chúng tôi (khiêm nhường)", example: "弊社の製品をご紹介します", exampleTranslation: "xin giới thiệu sản phẩm của công ty chúng tôi" },
  { exam: "BJT_J1", term: "貴社", reading: "きしゃ", meaning: "công ty quý vị", example: "貴社のご協力をお願いします", exampleTranslation: "kính mong sự hợp tác của quý công ty" },
  { exam: "BJT_J1", term: "至急", reading: "しきゅう", meaning: "khẩn cấp, càng sớm càng tốt", example: "至急ご連絡ください", exampleTranslation: "xin liên hệ gấp" },
  { exam: "BJT_J1", term: "ご査収", reading: "ごさしゅう", meaning: "kính mong nhận và kiểm tra", example: "資料をご査収ください", exampleTranslation: "kính mong quý vị nhận và kiểm tra tài liệu" },
  { exam: "BJT_J1", term: "保留", reading: "ほりゅう", meaning: "hoãn lại, giữ lại", example: "決定を保留する", exampleTranslation: "hoãn quyết định" },
  { exam: "BJT_J1", term: "手直し", reading: "てなおし", meaning: "sửa lại một phần", example: "企画書を手直しする", exampleTranslation: "chỉnh sửa bản kế hoạch" },
  { exam: "BJT_J1", term: "折衝", reading: "せっしょう", meaning: "đàm phán, thương lượng", example: "価格について折衝する", exampleTranslation: "đàm phán về giá cả" },
  { exam: "BJT_J1", term: "納期", reading: "のうき", meaning: "thời hạn giao hàng", example: "納期を守る", exampleTranslation: "đúng hạn giao hàng" },
  { exam: "BJT_J1", term: "見積もり", reading: "みつもり", meaning: "báo giá, dự toán", example: "見積もりを依頼する", exampleTranslation: "yêu cầu báo giá" },
  { exam: "BJT_J1", term: "発注", reading: "はっちゅう", meaning: "đặt hàng", example: "部品を発注する", exampleTranslation: "đặt hàng linh kiện" },
  { exam: "BJT_J1", term: "棚卸し", reading: "たなおろし", meaning: "kiểm kê hàng tồn kho", example: "月末に棚卸しを行う", exampleTranslation: "kiểm kê cuối tháng" },
  { exam: "BJT_J1", term: "売上高", reading: "うりあげだか", meaning: "doanh thu", example: "売上高が伸びる", exampleTranslation: "doanh thu tăng" },
  { exam: "BJT_J1", term: "取引先", reading: "とりひきさき", meaning: "đối tác giao dịch", example: "取引先と契約を結ぶ", exampleTranslation: "ký hợp đồng với đối tác" },
  { exam: "BJT_J1", term: "稟議", reading: "りんぎ", meaning: "xin duyệt (quy trình phê duyệt nội bộ)", example: "稟議を通す", exampleTranslation: "được phê duyệt" },
  { exam: "BJT_J1", term: "粗利益", reading: "あらりえき", meaning: "lợi nhuận gộp", example: "粗利益率を改善する", exampleTranslation: "cải thiện tỷ lệ lợi nhuận gộp" },
];