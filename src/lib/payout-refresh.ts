import { prisma } from "@/lib/prisma";

export async function refreshDraftPayouts(month: string) {
  const courseInclude = {
    teacher: { select: { id: true } },
    packSubjects: {
      include: { subject: { include: { teacher: { select: { id: true } } } } },
    },
  } as const;
  const [payouts, collections] = await Promise.all([
    prisma.payout.findMany({ where: { month, status: "مسودة" } }),
    prisma.paymentCollection.findMany({
      where: { date: { startsWith: month } },
      include: {
        payment: {
          include: {
            course: { include: courseInclude },
            enrollment: { include: { course: { include: courseInclude } } },
          },
        },
      },
    }),
  ]);

  for (const payout of payouts) {
    const studentIds = new Set<number>();
    let revenue = 0;
    for (const collection of collections) {
      const payment = collection.payment;
      if (payment.status !== "مدفوع" && payment.status !== "جزئي") continue;
      const course = payment.course || payment.enrollment?.course;
      if (!course) continue;
      const subjects = course.type === "باقة"
        ? course.packSubjects.map((link) => link.subject)
        : [course];
      if (!subjects.length) continue;
      const teacherSubjects = subjects.filter((subject) => subject.teacher?.id === payout.teacherId);
      if (!teacherSubjects.length) continue;
      studentIds.add(payment.studentId);
      revenue += collection.amount * teacherSubjects.length / subjects.length;
    }
    const roundedRevenue = Math.round(revenue);
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        studentCount: studentIds.size,
        revenue: roundedRevenue,
        amount: Math.round(roundedRevenue * payout.commission / 100),
      },
    });
  }
}
