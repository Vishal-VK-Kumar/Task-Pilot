// Realistic seed data: early-career job search + coursework + errands.
// Roles restricted to early-career product / business analyst / data analyst.
// Locations mix India and Europe.

import { Task } from './types';

function iso(offsetMinutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
}
function isoAt(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildDemoData(): Task[] {
  const now = new Date().toISOString();
  const tasks: Task[] = [
    // Overdue
    { id: 'demo-1', title: 'Submit updated CV to campus placement portal', list: 'job', done: false, dueAt: isoAt(-1, 17), createdAt: now },
    { id: 'demo-2', title: 'Return library books', list: 'personal', done: false, dueAt: isoAt(-2, 18), createdAt: now },

    // Today
    { id: 'demo-3', title: 'Finish SQL joins assignment', list: 'studies', done: false, dueAt: isoAt(0, 21), createdAt: now, notes: 'Chapter 5 exercises' },
    { id: 'demo-4', title: 'Reply to recruiter at Zomato', list: 'job', done: false, dueAt: isoAt(0, 15, 30), createdAt: now },
    { id: 'demo-5', title: 'Grocery run — milk, eggs, bread', list: 'personal', done: false, dueAt: isoAt(0, 19), createdAt: now },
    { id: 'demo-6', title: 'Review Excel pivot tables notes', list: 'studies', done: true, dueAt: isoAt(0, 10), completedAt: isoAt(0, 11), createdAt: now },

    // Upcoming (this week)
    { id: 'demo-7', title: 'Mock interview with mentor', list: 'job', done: false, dueAt: isoAt(1, 11), createdAt: now },
    { id: 'demo-8', title: 'Final year project milestone submission', list: 'studies', done: false, dueAt: isoAt(2, 23, 59), createdAt: now },
    { id: 'demo-9', title: 'Call mom', list: 'personal', done: false, dueAt: isoAt(1, 20), createdAt: now },
    { id: 'demo-10', title: 'Dentist appointment', list: 'personal', done: false, dueAt: isoAt(3, 10, 30), createdAt: now },
    { id: 'demo-11', title: 'Prepare for Statistics quiz', list: 'studies', done: false, dueAt: isoAt(4, 9), createdAt: now },
    { id: 'demo-12', title: 'LinkedIn — update profile summary', list: 'job', done: false, dueAt: isoAt(5, 18), createdAt: now },

    // Someday (no due date)
    { id: 'demo-13', title: 'Plan Goa trip with friends', list: 'personal', done: false, createdAt: now },
    { id: 'demo-14', title: 'Read "Storytelling with Data"', list: 'studies', done: false, createdAt: now },
    { id: 'demo-15', title: 'Build a personal portfolio site', list: 'job', done: false, createdAt: now },

    // Applications (8 across all stages)
    { id: 'app-1', title: 'Flipkart — Business Analyst, Bengaluru', list: 'job', done: false, createdAt: now, company: 'Flipkart', role: 'Business Analyst', link: 'https://www.flipkartcareers.com/', stage: 'to_apply', nextActionAt: isoAt(2, 20) },
    { id: 'app-2', title: 'Revolut — Data Analyst, London', list: 'job', done: false, createdAt: now, company: 'Revolut', role: 'Data Analyst Graduate', link: 'https://www.revolut.com/careers/', stage: 'to_apply', nextActionAt: isoAt(3, 12) },
    { id: 'app-3', title: 'Swiggy — Associate Product Manager, Bengaluru', list: 'job', done: false, createdAt: now, company: 'Swiggy', role: 'Associate Product Manager', link: 'https://careers.swiggy.com/', stage: 'applied', nextActionAt: isoAt(5, 10) },
    { id: 'app-4', title: 'Zalando — Junior Business Analyst, Berlin', list: 'job', done: false, createdAt: now, company: 'Zalando', role: 'Junior Business Analyst', link: 'https://jobs.zalando.com/', stage: 'applied', nextActionAt: isoAt(4, 15) },
    { id: 'app-5', title: 'Razorpay — Product Analyst, Bengaluru', list: 'job', done: false, createdAt: now, company: 'Razorpay', role: 'Product Analyst', link: 'https://razorpay.com/jobs/', stage: 'interviewing', nextActionAt: isoAt(1, 11) },
    { id: 'app-6', title: 'Klarna — Data Analyst Graduate, Stockholm', list: 'job', done: false, createdAt: now, company: 'Klarna', role: 'Data Analyst Graduate', link: 'https://jobs.klarna.com/', stage: 'interviewing', nextActionAt: isoAt(2, 16) },
    { id: 'app-7', title: 'Zoho — Associate Product Manager, Chennai', list: 'job', done: false, createdAt: now, company: 'Zoho', role: 'Associate Product Manager', link: 'https://www.zoho.com/careers/', stage: 'offer', nextActionAt: isoAt(6, 17) },
    { id: 'app-8', title: 'N26 — Junior Data Analyst, Berlin', list: 'job', done: false, createdAt: now, company: 'N26', role: 'Junior Data Analyst', link: 'https://n26.com/careers/', stage: 'rejected' },
  ];
  return tasks;
}
