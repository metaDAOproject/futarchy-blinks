import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import {
  Action,
  ActionGetResponse,
  ActionPostResponse,
  CompletedAction,
  actionCorsMiddleware,
} from '@solana/actions';
import { createClient } from './__generated__';

const LOGO =
  'https://imagedelivery.net/HYEnlujCFMCgj6yA728xIw/c86809b4-f37e-4a77-4a47-608533a97900/public';

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Express app setup
const app = express();
app.use(express.json());
app.use(actionCorsMiddleware());

// Routes
app.get('/actions.json', getActionsJson);
app.get('/api/proposal-link/:proposalAccount', getProposalLink);
app.post('/api/proposal-link/link', postProposalLink);

// Route handlers
function getActionsJson(req, res) {
  const payload = {
    rules: [
      { pathPattern: '/*', apiPath: '/api/proposal-link/*' },
      { pathPattern: '/api/proposal-link/**', apiPath: '/api/proposal-link/**' },
    ],
  };
  res.json(payload);
}

async function getProposalLink(req, res) {
  try {
    const proposalAccount = req.params.proposalAccount;
    const client = createClient({
      url: process.env.NEXT_PUBLIC_INDEXER_URL,
    });
    const response = await client.query({
      proposal_details: {
        __args: {
          where: {
            proposal_acct: { _eq: proposalAccount },
          },
        },
        proposal_acct: true,
        title: true,
        description: true,
        proposal: {
          dao: {
            dao_detail: {
              slug: true,
            }
          }
        }
      }
    });
    const proposalDetails = response.proposal_details?.[0];

    if (!proposalDetails) {
      return res.status(400).json({
        type: 'error',
        message: 'Proposal not found',
      });
    }

    const slug = proposalDetails.proposal?.dao?.dao_detail?.slug;

    if (!slug) {
      return res.status(400).json({
        type: 'error',
        message: 'DAO slug not found',
      });
    }

    const payload = {
      type: 'action',
      icon: LOGO,
      title: proposalDetails.title ?? '',
      label: 'Proposal link',
      description: "",
      links: {
        actions: [
          {
            type: 'external-link',
            label: 'Trade proposal',
            href: `${BASE_URL}/api/proposal-link/link?proposalAccount=${proposalAccount}&slug=${slug}`,
          },
        ],
      },
    };

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err?.message || err });
  }
}

async function postProposalLink(req, res) {
  try {
    const { proposalAccount, slug } = req.query;
    const payload = {
      type: 'external-link',
      externalLink: `https://staging.themetadao.org/${slug}/trade/${proposalAccount}`,
    };
    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message || 'An unknown error occurred' });
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
