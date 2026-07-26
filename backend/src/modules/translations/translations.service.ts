import { Injectable, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTranslationPackDto, VoteTranslationPackDto, CreateProposalDto, VoteProposalDto } from './dto/translation.dto';

@Injectable()
export class TranslationsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultLanguages();
  }

  private async seedDefaultLanguages() {
    // 1. System User for seed proposals
    let admin = await this.prisma.user.findFirst();

    // Seed English (en)
    const enPack = await this.prisma.translationPack.upsert({
      where: { code: 'en' },
      create: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        isOfficial: true,
        isPublished: true,
      },
      update: {},
    });

    // Seed Khmer (km)
    const kmPack = await this.prisma.translationPack.upsert({
      where: { code: 'km' },
      create: {
        code: 'km',
        name: 'Khmer',
        nativeName: 'ភាសាខ្មែរ',
        flag: '🇰🇭',
        isOfficial: true,
        isPublished: true,
      },
      update: {},
    });

    const defaultKeys = [
      { key: 'greeting', description: 'Friendly greeting message' },
      { key: 'common.channels', description: 'Channels section header' },
      { key: 'common.direct_messages', description: 'Direct Messages section header' },
      { key: 'common.send', description: 'Send button label' },
      { key: 'common.cancel', description: 'Cancel button label' },
      { key: 'common.save', description: 'Save button label' },
      { key: 'common.settings', description: 'Settings modal title' },
      { key: 'common.search', description: 'Search placeholder text' },
      { key: 'common.typing', description: 'User typing status text' },
      { key: 'common.create_channel', description: 'Create Channel button' },
      { key: 'common.create_workspace', description: 'Create Workspace button' },
      { key: 'auth.sign_in', description: 'Sign in tab title' },
      { key: 'auth.register', description: 'Register tab title' },
    ];

    const kmDefaultProposals: Record<string, string[]> = {
      greeting: ['ជម្រាបសួរ', 'សួស្ដី', 'សូមស្វាគមន៍'],
      'common.channels': ['បណ្តាញ', 'ប្រព័ន្ធផ្សព្វផ្សាយ'],
      'common.direct_messages': ['សារផ្ទាល់', 'សារឯកជន'],
      'common.send': ['ផ្ញើ'],
      'common.cancel': ['បោះបង់'],
      'common.save': ['រក្សាទុក'],
      'common.settings': ['ការកំណត់'],
      'common.search': ['ស្វែងរកសារ...'],
      'common.typing': ['កំពុងវាយអក្សរ...'],
      'common.create_channel': ['បង្កើតបណ្តាញថ្មី'],
      'common.create_workspace': ['បង្កើតលំហការងារថ្មី'],
      'auth.sign_in': ['ចូលគណនី'],
      'auth.register': ['ចុះឈ្មោះ'],
    };

    const enDefaultProposals: Record<string, string> = {
      greeting: 'Hello & Welcome',
      'common.channels': 'Channels',
      'common.direct_messages': 'Direct Messages',
      'common.send': 'Send',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.settings': 'Settings',
      'common.search': 'Search messages...',
      'common.typing': 'is typing...',
      'common.create_channel': 'Create Channel',
      'common.create_workspace': 'Create Workspace',
      'auth.sign_in': 'Sign In',
      'auth.register': 'Register',
    };

    for (const item of defaultKeys) {
      // Seed EN Key & Proposal
      const enKeyRecord = await this.prisma.translationKey.upsert({
        where: { translationPackId_key: { translationPackId: enPack.id, key: item.key } },
        create: { translationPackId: enPack.id, key: item.key, description: item.description },
        update: {},
      });

      if (admin && enDefaultProposals[item.key]) {
        const existingProp = await this.prisma.translationProposal.findFirst({
          where: { translationKeyId: enKeyRecord.id, value: enDefaultProposals[item.key] },
        });
        if (!existingProp) {
          await this.prisma.translationProposal.create({
            data: {
              translationKeyId: enKeyRecord.id,
              value: enDefaultProposals[item.key],
              createdById: admin.id,
            },
          });
        }
      }

      // Seed KM Key & Proposals
      const kmKeyRecord = await this.prisma.translationKey.upsert({
        where: { translationPackId_key: { translationPackId: kmPack.id, key: item.key } },
        create: { translationPackId: kmPack.id, key: item.key, description: item.description },
        update: {},
      });

      if (admin && kmDefaultProposals[item.key]) {
        for (const propValue of kmDefaultProposals[item.key]) {
          const existingProp = await this.prisma.translationProposal.findFirst({
            where: { translationKeyId: kmKeyRecord.id, value: propValue },
          });
          if (!existingProp) {
            await this.prisma.translationProposal.create({
              data: {
                translationKeyId: kmKeyRecord.id,
                value: propValue,
                createdById: admin.id,
              },
            });
          }
        }
      }
    }
  }

  async listPacks(currentUserId?: string) {
    const packs = await this.prisma.translationPack.findMany({
      where: { isPublished: true },
      include: {
        createdBy: { select: { id: true, username: true } },
        votes: true,
        _count: { select: { keys: true } },
      },
      orderBy: [{ isOfficial: 'desc' }, { createdAt: 'asc' }],
    });

    return packs.map((p) => {
      const upvotes = p.votes.filter((v) => v.vote > 0).length;
      const downvotes = p.votes.filter((v) => v.vote < 0).length;
      const score = upvotes - downvotes;
      const userVote = currentUserId ? p.votes.find((v) => v.userId === currentUserId)?.vote || 0 : 0;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        nativeName: p.nativeName,
        flag: p.flag,
        isOfficial: p.isOfficial,
        createdBy: p.createdBy?.username || 'System',
        keyCount: p._count.keys,
        upvotes,
        downvotes,
        score,
        userVote,
        createdAt: p.createdAt,
      };
    });
  }

  async getPackDictionary(code: string) {
    const pack = await this.prisma.translationPack.findUnique({
      where: { code },
      include: {
        keys: {
          include: {
            proposals: {
              include: { votes: true },
            },
          },
        },
      },
    });

    if (!pack) {
      throw new NotFoundException(`Language pack '${code}' not found`);
    }

    const dictionary: Record<string, string> = {};

    pack.keys.forEach((k) => {
      if (k.proposals.length > 0) {
        // Pick proposal with highest vote score
        const sorted = [...k.proposals].sort((a, b) => {
          const scoreA = a.votes.filter((v) => v.vote > 0).length - a.votes.filter((v) => v.vote < 0).length;
          const scoreB = b.votes.filter((v) => v.vote > 0).length - b.votes.filter((v) => v.vote < 0).length;
          return scoreB - scoreA;
        });
        dictionary[k.key] = sorted[0].value;
      }
    });

    return {
      code: pack.code,
      name: pack.name,
      nativeName: pack.nativeName,
      flag: pack.flag,
      dictionary,
    };
  }

  async getKeyProposals(code: string, currentUserId?: string) {
    const pack = await this.prisma.translationPack.findUnique({
      where: { code },
      include: {
        keys: {
          include: {
            proposals: {
              include: {
                createdBy: { select: { id: true, username: true } },
                votes: true,
              },
            },
          },
        },
      },
    });

    if (!pack) {
      throw new NotFoundException(`Language pack '${code}' not found`);
    }

    return pack.keys.map((k) => {
      const proposals = k.proposals.map((prop) => {
        const upvotes = prop.votes.filter((v) => v.vote > 0).length;
        const downvotes = prop.votes.filter((v) => v.vote < 0).length;
        const score = upvotes - downvotes;
        const userVote = currentUserId ? prop.votes.find((v) => v.userId === currentUserId)?.vote || 0 : 0;

        return {
          id: prop.id,
          value: prop.value,
          createdBy: prop.createdBy?.username || 'Community',
          upvotes,
          downvotes,
          score,
          userVote,
          createdAt: prop.createdAt,
        };
      }).sort((a, b) => b.score - a.score);

      return {
        id: k.id,
        key: k.key,
        description: k.description,
        proposals,
        activeValue: proposals.length > 0 ? proposals[0].value : '',
      };
    });
  }

  async createPack(userId: string, dto: CreateTranslationPackDto) {
    const existing = await this.prisma.translationPack.findUnique({
      where: { code: dto.code.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException(`Language code '${dto.code}' already exists`);
    }

    const pack = await this.prisma.translationPack.create({
      data: {
        code: dto.code.toLowerCase(),
        name: dto.name,
        nativeName: dto.nativeName,
        flag: dto.flag || '🌐',
        createdById: userId,
        isOfficial: false,
        isPublished: true,
      },
    });

    // Copy default keys to new pack
    const enPack = await this.prisma.translationPack.findUnique({
      where: { code: 'en' },
      include: { keys: true },
    });

    if (enPack) {
      for (const k of enPack.keys) {
        await this.prisma.translationKey.create({
          data: {
            translationPackId: pack.id,
            key: k.key,
            description: k.description,
          },
        });
      }
    }

    return pack;
  }

  async votePack(userId: string, packId: string, dto: VoteTranslationPackDto) {
    const pack = await this.prisma.translationPack.findUnique({
      where: { id: packId },
    });

    if (!pack) {
      throw new NotFoundException('Language pack not found');
    }

    if (dto.vote === 0) {
      await this.prisma.translationPackVote.deleteMany({
        where: { translationPackId: packId, userId },
      });
    } else {
      await this.prisma.translationPackVote.upsert({
        where: { translationPackId_userId: { translationPackId: packId, userId } },
        create: { translationPackId: packId, userId, vote: dto.vote > 0 ? 1 : -1 },
        update: { vote: dto.vote > 0 ? 1 : -1 },
      });
    }

    return { success: true };
  }

  async submitProposal(userId: string, keyId: string, dto: CreateProposalDto) {
    const keyRecord = await this.prisma.translationKey.findUnique({
      where: { id: keyId },
    });

    if (!keyRecord) {
      throw new NotFoundException('Translation key not found');
    }

    // Check if duplicate proposal value exists
    const existing = await this.prisma.translationProposal.findFirst({
      where: { translationKeyId: keyId, value: dto.value.trim() },
    });

    if (existing) {
      throw new BadRequestException('This exact translation proposal already exists for this key.');
    }

    const proposal = await this.prisma.translationProposal.create({
      data: {
        translationKeyId: keyId,
        value: dto.value.trim(),
        createdById: userId,
      },
    });

    // Auto upvote by creator
    await this.prisma.proposalVote.create({
      data: {
        translationProposalId: proposal.id,
        userId,
        vote: 1,
      },
    });

    return proposal;
  }

  async voteProposal(userId: string, proposalId: string, dto: VoteProposalDto) {
    const proposal = await this.prisma.translationProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Translation proposal not found');
    }

    if (dto.vote === 0) {
      await this.prisma.proposalVote.deleteMany({
        where: { translationProposalId: proposalId, userId },
      });
    } else {
      await this.prisma.proposalVote.upsert({
        where: { translationProposalId_userId: { translationProposalId: proposalId, userId } },
        create: { translationProposalId: proposalId, userId, vote: dto.vote > 0 ? 1 : -1 },
        update: { vote: dto.vote > 0 ? 1 : -1 },
      });
    }

    return { success: true };
  }
}
