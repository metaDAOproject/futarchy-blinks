import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import {
  actionCorsMiddleware
} from '@solana/actions';
import { createClient } from './__generated__';

const LOGO =
  'https://imagedelivery.net/HYEnlujCFMCgj6yA728xIw/c86809b4-f37e-4a77-4a47-608533a97900/public';

const PORT = process.env.PORT || 3030;
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'localhost';
const BASE_URL = `https://${DEPLOYMENT_URL}:${PORT}`;

const APP_URL = process.env.APP_URL ?? 'staging.themetadao.org';

const BLOCKCHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'; // Mainnet
const ACTION_VERSION = '2.1.3';
// const BLOCKCHAIN_ID = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'; // Devnet

// Express app setup
const app = express();
app.use(express.json());
app.use(actionCorsMiddleware());

// Middleware for specific routes
const addCustomHeaders = (req, res, next) => {
  res.header('X-Action-Version', ACTION_VERSION);
  res.header('X-Blockchain-IDs', BLOCKCHAIN_ID);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  next();
};

// Routes
app.get('/api/proposal-link/:daoSlug/trade/:proposalAccount', addCustomHeaders, getProposalLink);
app.post('/api/proposal-link/link', addCustomHeaders, postProposalLink);

async function getProposalLink(req, res) {
  try {
    const proposalAccount = req.params.proposalAccount;
    const client = createClient({
      url: process.env.GRAPHQL_URL,
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
      externalLink: `https://${APP_URL}/${slug}/trade/${proposalAccount}`,
    };
    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message || 'An unknown error occurred' });
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`GRAPHQL_URL: ${process.env.GRAPHQL_URL}`);
  console.log(`DEPLOYMENT_URL: ${process.env.DEPLOYMENT_URL}`);
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`APP_URL: ${APP_URL}`);
  console.log(`BLOCKCHAIN_ID: ${BLOCKCHAIN_ID}`);
  console.log(`ACTION_VERSION: ${ACTION_VERSION}`);
});

export default app;
