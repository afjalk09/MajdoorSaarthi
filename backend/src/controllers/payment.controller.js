const prisma = require('../lib/prisma');

exports.initiatePayment = async (req, res, next) => {
  try {
    const { job_id, worker_id, amount, payment_method } = req.body;

    if (!job_id || !worker_id || !amount || !payment_method) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer) {
      return res.status(400).json({ success: false, message: 'Employer profile not found' });
    }

    const job = await prisma.job.findUnique({ where: { id: job_id } });
    if (!job || job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const commission = parseFloat(amount) * 0.05;

    const payment = await prisma.payment.create({
      data: {
        jobId: job_id,
        workerId: worker_id,
        employerId: employer.id,
        amount: parseFloat(amount),
        platformCommission: commission,
        paymentMethod: payment_method.toUpperCase(),
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const worker = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!worker || payment.workerId !== worker.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' }
    });

    res.json({ success: true, data: updatedPayment });
  } catch (error) {
    next(error);
  }
};
