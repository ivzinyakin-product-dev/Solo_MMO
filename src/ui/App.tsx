import { useState, useEffect } from 'preact/hooks';
import { Player } from '../entities/Player';
import { GameWorld } from '../core/GameWorld';
import { EventBus } from '../core/EventBus';
import { HUD } from './HUD';
import { StatsWindow } from './StatsWindow';
import { InventoryWindow } from './InventoryWindow';
import { BestiaryWindow } from './BestiaryWindow';
import { JobChangeModal } from './JobChangeModal';
import { SkillHotbar } from './SkillHotbar';
import { CampWindow } from './CampWindow';
import { SkillsWindow } from './SkillsWindow';
import { QuestsWindow } from './QuestsWindow';
import { VillageShopModal } from './VillageShopModal';
import { CardExchangeModal } from './CardExchangeModal';
import { EliteBountyModal } from './EliteBountyModal';
import { WorldMapWindow } from './WorldMapWindow';
import { ToastLog } from './ToastLog';

interface AppProps {
  world: GameWorld;
  player: Player;
}

export function App({ world, player }: AppProps) {
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState(false);
  const [isJobChangeOpen, setIsJobChangeOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isCampOpen, setIsCampOpen] = useState(false);
  const [campTab, setCampTab] = useState<'blacksmith' | 'market' | 'alchemy' | 'companion'>('blacksmith');
  const [campSubTab, setCampSubTab] = useState<'forge' | 'refine' | 'card_extract' | 'salvage' | 'reforge'>('forge');
  const [skillsInitialTab, setSkillsInitialTab] = useState<'skills' | 'jobs' | 'mastery'>('skills');
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isCardExchangeOpen, setIsCardExchangeOpen] = useState(false);
  const [isEliteBountyOpen, setIsEliteBountyOpen] = useState(false);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState(false);

  useEffect(() => {
    const unsubJob = EventBus.on('OPEN_JOB_SELECT', (open) => {
      setSkillsInitialTab('jobs');
      setIsSkillsOpen(open);
    });
    const unsubSkills = EventBus.on('OPEN_SKILLS_WINDOW', (payload) => {
      if (typeof payload === 'object' && payload?.initialTab) {
        setSkillsInitialTab(payload.initialTab);
        setIsSkillsOpen(true);
      } else {
        setSkillsInitialTab('skills');
        setIsSkillsOpen(!!payload);
      }
    });
    const unsubQuests = EventBus.on('OPEN_QUESTS_WINDOW', (open) => {
      setIsQuestsOpen(open);
    });
    const unsubEliteBounty = EventBus.on('OPEN_ELITE_BOUNTY_MODAL', (open) => {
      setIsEliteBountyOpen(open);
    });
    const unsubWorldMap = EventBus.on('OPEN_WORLD_MAP', (open) => {
      setIsWorldMapOpen(open);
    });
    const unsubCardExchange = EventBus.on('OPEN_CARD_EXCHANGE_MODAL', (open) => {
      setIsCardExchangeOpen(open);
    });
    const unsubShop = EventBus.on('OPEN_SHOP_MODAL', (open) => {
      setIsShopOpen(open);
    });
    const unsubCampTab = EventBus.on('OPEN_CAMP_TAB', (data) => {
      setCampTab(data.tab);
      if (data.subTab) {
        setCampSubTab(data.subTab);
      }
      setIsCampOpen(true);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') {
        setIsStatsOpen((prev) => !prev);
      } else if (
        e.key === 'i' ||
        e.key === 'I' ||
        e.key === 'ш' ||
        e.key === 'Ш' ||
        e.key === 'b' ||
        e.key === 'B' ||
        e.key === 'и' ||
        e.key === 'И'
      ) {
        setIsInventoryOpen((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
        setIsWorldMapOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsStatsOpen(false);
        setIsInventoryOpen(false);
        setIsBestiaryOpen(false);
        setIsJobChangeOpen(false);
        setIsSkillsOpen(false);
        setIsCampOpen(false);
        setIsQuestsOpen(false);
        setIsShopOpen(false);
        setIsCardExchangeOpen(false);
        setIsEliteBountyOpen(false);
        setIsWorldMapOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubJob();
      unsubSkills();
      unsubQuests();
      unsubEliteBounty();
      unsubWorldMap();
      unsubCardExchange();
      unsubShop();
      unsubCampTab();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCastSkill = (skillId: string) => {
    world.castSkill(skillId);
  };

  return (
    <div className="relative w-full h-full pointer-events-none">
      <HUD
        player={player}
        world={world}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenBestiary={() => setIsBestiaryOpen(true)}
        onOpenJobChange={() => setIsSkillsOpen(true)}
        onOpenSkills={() => setIsSkillsOpen(true)}
        onOpenCamp={() => {
          setCampTab('blacksmith');
          setIsCampOpen(true);
        }}
        onOpenQuests={() => setIsQuestsOpen(true)}
        onOpenWorldMap={() => setIsWorldMapOpen(true)}
      />

      <SkillHotbar
        player={player}
        skillSystem={world.skillSystem}
        onCastSkill={handleCastSkill}
      />

      <StatsWindow
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        player={player}
        onOpenInventory={() => {
          setIsStatsOpen(false);
          setIsInventoryOpen(true);
        }}
      />

      <InventoryWindow
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        player={player}
        onOpenStats={() => {
          setIsInventoryOpen(false);
          setIsStatsOpen(true);
        }}
      />

      <BestiaryWindow
        isOpen={isBestiaryOpen}
        onClose={() => setIsBestiaryOpen(false)}
        player={player}
      />

      <JobChangeModal
        isOpen={isJobChangeOpen}
        onClose={() => setIsJobChangeOpen(false)}
        player={player}
      />

      <SkillsWindow
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
        player={player}
        initialTab={skillsInitialTab}
      />

      <CampWindow
        isOpen={isCampOpen}
        onClose={() => setIsCampOpen(false)}
        player={player}
        world={world}
        initialTab={campTab}
        initialSubTab={campSubTab}
      />

      <QuestsWindow
        isOpen={isQuestsOpen}
        onClose={() => setIsQuestsOpen(false)}
        world={world}
        player={player}
      />

      <VillageShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        player={player}
        world={world}
      />

      <CardExchangeModal
        isOpen={isCardExchangeOpen}
        onClose={() => setIsCardExchangeOpen(false)}
        player={player}
      />

      <EliteBountyModal
        isOpen={isEliteBountyOpen}
        onClose={() => setIsEliteBountyOpen(false)}
        world={world}
        player={player}
      />

      <WorldMapWindow
        isOpen={isWorldMapOpen}
        onClose={() => setIsWorldMapOpen(false)}
        player={player}
        world={world}
      />

      <ToastLog />
    </div>
  );
}
