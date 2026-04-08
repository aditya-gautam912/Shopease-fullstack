/**
 * src/models/Ticket.js
 * Mongoose schema and model for customer support tickets.
 * Supports both authenticated users and guest submissions.
 */

const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  message: {
    type: String,
    required: [true, 'Response message is required'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  guestEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  guestName: {
    type: String,
    trim: true,
    default: null,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'in-progress', 'resolved'],
      message: '{VALUE} is not a valid status',
    },
    default: 'open',
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: '{VALUE} is not a valid priority',
    },
    default: 'medium',
  },
  responses: {
    type: [responseSchema],
    default: [],
  },
}, {
  timestamps: true,
});

// Validate that either userId or both guestEmail and guestName are provided
ticketSchema.pre('validate', function(next) {
  if (!this.userId && (!this.guestEmail || !this.guestName)) {
    this.invalidate('guestEmail', 'Email is required for guest tickets');
    this.invalidate('guestName', 'Name is required for guest tickets');
  }
  next();
});

// Index for efficient queries
ticketSchema.index({ userId: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
