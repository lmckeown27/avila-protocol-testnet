# Data Flow Diagrams: Backend to Frontend

## Overview
This document provides visual representations of data flow through the Avila Protocol system, from user interactions to blockchain state changes.

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Interface                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │    Home     │  │   Markets   │  │    Trade    │  │  Portfolio  │      │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend Services                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Aptos     │  │  Contract   │  │   Wallet    │  │    Store    │      │
│  │  Service    │  │  Service    │  │   Service   │  │ (Zustand)   │      │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Aptos Blockchain                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Options   │  │   Order     │  │   Margin    │  │ Settlement  │      │
│  │    Core     │  │    Book     │  │   Engine    │  │   Engine    │      │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. User Order Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │    │   Trade     │    │  Contract   │    │   Wallet    │
│   Input     │───►│   Form      │───►│   Service   │───►│   Service   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Aptos     │    │   Order     │    │   Event     │    │    UI       │
│ Blockchain  │◄───│    Book     │◄───│  Emission   │◄───│   Update    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 3. Price Update Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  External   │    │   Price     │    │   Event     │    │   Frontend  │
│   Oracle    │───►│   Oracle    │───►│  Emission   │───►│   Service   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Markets   │    │    Store    │    │ Components  │    │    UI       │
│    Page     │◄───│   Update    │◄───│   Re-render │◄───│   Display   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 4. Portfolio Update Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Wallet    │    │   Aptos     │    │  Contract   │    │    Store    │
│  Connect    │───►│  Service    │───►│   Service   │───►│   Update    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Portfolio  │    │ Components  │    │    Hooks    │    │    State    │
│    Page     │◄───│   Re-render │◄───│   Update    │◄───│  Sync      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 5. State Synchronization Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Timer     │    │   Polling   │    │   Event     │    │   State     │
│  Trigger    │───►│   Service   │───►│  Processing │───►│   Update    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Components  │    │    Hooks    │    │    Store    │    │    Cache    │
│   Re-render │◄───│   Update    │◄───│   Sync      │◄───│   Update    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 6. Security Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │   Wallet    │    │   Message   │    │   Signature │
│  Action     │───►│  Connection │───►│   Signing   │───►│  Validation │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Transaction │    │   Contract  │    │   State     │    │   Success   │
│ Submission  │◄───│  Execution  │◄───│   Update    │◄───│  Confirmation│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

These diagrams provide a comprehensive view of how data flows through the Avila Protocol system, ensuring developers understand the complete data lifecycle from user interaction to blockchain state changes. 