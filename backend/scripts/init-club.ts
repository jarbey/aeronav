#!/usr/bin/env tsx
/**
 * AeroNav — Init script
 * Creates the first aeroclub and admin user in a fresh database.
 * Run with: npm run init
 */

import { createInterface } from 'readline';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function askDefault(question: string, defaultVal: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(`${question} [${defaultVal}]: `, answer => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   AeroNav — Initialisation           ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Check if already initialized
  const clubCount = await prisma.aeroclub.count();
  if (clubCount > 0) {
    const clubs = await prisma.aeroclub.findMany({ select: { name: true, code: true } });
    console.log('⚠️  La base contient déjà des aéroclubs :');
    clubs.forEach(c => console.log(`   • ${c.name} (${c.code})`));
    console.log('\nPour ajouter un aéroclub supplémentaire, utilisez l\'interface admin.');
    console.log('Pour réinitialiser complètement, lancez : npx prisma migrate reset\n');
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('Aucun aéroclub trouvé. Création du premier aéroclub et du compte admin.\n');

  // Aeroclub info
  console.log('── Aéroclub ──────────────────────────────');
  const acName = await ask('Nom complet de l\'aéroclub : ');
  if (!acName) { console.error('Le nom est requis.'); process.exit(1); }

  const acCode = (await ask('Code court (ex: ACNA, max 8 car.) : ')).toUpperCase();
  if (!acCode) { console.error('Le code est requis.'); process.exit(1); }

  const acCity = await ask('Ville : ');
  const acBase = (await ask('ICAO de l\'aérodrome de base (ex: LFRS) : ')).toUpperCase();
  const acColor = await askDefault('Couleur principale (hex)', '#1b5fa8');

  // Admin user
  console.log('\n── Compte administrateur ─────────────────');
  const email = (await ask('Email : ')).toLowerCase();
  if (!email || !email.includes('@')) { console.error('Email invalide.'); process.exit(1); }

  const firstName = await ask('Prénom : ');
  const lastName = await ask('Nom : ');

  console.log('\n── Récapitulatif ──────────────────────────');
  console.log(`Aéroclub : ${acName} (${acCode}) — base ${acBase}`);
  console.log(`Admin    : ${firstName} ${lastName} <${email}>`);

  const confirm = await ask('\nCréer ? (o/N) : ');
  if (confirm.toLowerCase() !== 'o') {
    console.log('Annulé.');
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  // Create
  const aeroclub = await prisma.aeroclub.create({
    data: {
      name: acName,
      code: acCode,
      city: acCity,
      color: acColor,
      baseIcao: acBase,
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      role: 'Admin club',
      aeroclubId: aeroclub.id,
      provider: 'local',
    },
  });

  console.log('\n✅ Aéroclub créé  :', aeroclub.name, `(ID: ${aeroclub.id})`);
  console.log('✅ Admin créé     :', user.email, `(ID: ${user.id})`);
  console.log('\n────────────────────────────────────────────');
  console.log('Accédez à AeroNav et connectez-vous avec :');
  console.log(`  Email : ${email}`);
  console.log('────────────────────────────────────────────\n');

  rl.close();
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  rl.close();
  prisma.$disconnect();
  process.exit(1);
});
