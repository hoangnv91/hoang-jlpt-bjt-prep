import { PrismaClient } from "@prisma/client";
import { n1Questions } from "./seed/questions-n1";
import { bjtQuestions } from "./seed/questions-bjt";
import { n1Flashcards, bjtFlashcards } from "./seed/flashcards";

const prisma = new PrismaClient();

async function main() {
  const qCount = await prisma.question.count();
  if (qCount === 0) {
    await prisma.question.createMany({ data: [...n1Questions, ...bjtQuestions] });
    console.log(`Seeded ${n1Questions.length + bjtQuestions.length} questions`);
  } else {
    console.log(`Questions already exist (${qCount}), skipping`);
  }

  const fCount = await prisma.flashcard.count();
  if (fCount === 0) {
    await prisma.flashcard.createMany({
      data: [...n1Flashcards, ...bjtFlashcards],
    });
    console.log(`Seeded ${n1Flashcards.length + bjtFlashcards.length} flashcards`);
  } else {
    console.log(`Flashcards already exist (${fCount}), skipping`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });