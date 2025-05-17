import { uiManager } from './../../framework/uiManager';
import { BossBloodBar } from './bossBloodBar';
import { GameManager } from './../../fight/gameManager';
import { util } from './../../framework/util';
import { playerData } from './../../framework/playerData';
import { constant } from './../../framework/constant';
import { clientEvent } from './../../framework/clientEvent';
import { _decorator, Component, Node, LabelComponent, Label, ProgressBar, UITransform, profiler } from 'cc';
import { localConfig } from '../../framework/localConfig';
import { AudioManager } from '../../framework/audioManager';
const { ccclass, property } = _decorator;

@ccclass('FightPanel')
export class FightPanel extends Component {
    @property(Node)
    public ndJoystick: Node = null!;//手柄节点

    @property(LabelComponent)
    public lbGold: LabelComponent = null!;//金币数量

    @property(LabelComponent)
    public lbLevel: LabelComponent = null!;//等级

    @property(LabelComponent)
    public lbCardC1: LabelComponent = null!;//卡1的花费

    @property(LabelComponent)
    public lbCardC2: LabelComponent = null!;//卡2的花费

    @property(LabelComponent)
    public lbCardC3: LabelComponent = null!;//卡3的花费

    @property(Node)
    public ndBossBloodBar: Node = null!;//boss血量进度条节点

    private _debugClickTimes: number = 0;//调试点击次数
    private _car1_shop: number = 5;
    private _car2_shop: number = 10;
    private _car3_shop: number = 50;

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.REFRESH_GOLD, this._refreshGold, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_LEVEL, this._refreshLevel, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.REFRESH_GOLD, this._refreshGold, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_LEVEL, this._refreshLevel, this);
    }



    start () {
        // 开启就刷新下
        this._refreshCardShop();

        // 每N秒加一次金币
        setInterval(() => {
            this._refreshCardShop();

            if (GameManager.isGamePause || GameManager.isGameOver || !GameManager.isGameStart)
                return;
            GameManager.addGold(1);
        }, 5000);
    }


    show () {
        this.ndBossBloodBar.active = false;

        this._refreshGold();
        this._refreshLevel();

        if (GameManager.ndBoss) {
            let bossInfo = localConfig.instance.queryByID("base", constant.BASE.BOSS_01);
            let scriptBossBloodBar = this.ndBossBloodBar.getComponent(BossBloodBar) as BossBloodBar;
            scriptBossBloodBar.show(GameManager.scriptBoss, bossInfo.hp);
        }

        this._debugClickTimes = 0;
    }

    private _refreshGold () {
        this.lbGold.string = util.formatMoney(playerData.instance.playerInfo.gold);
    }

    private _refreshLevel () {
        this.lbLevel.string = `第${playerData.instance.playerInfo.level}层`;
    }

    private _refreshCardShop () {
        this.lbCardC1.string = util.formatMoney(playerData.instance.playerInfo.level + this._car1_shop);
        this.lbCardC2.string = util.formatMoney(playerData.instance.playerInfo.level + this._car2_shop);
        this.lbCardC3.string = util.formatMoney(playerData.instance.playerInfo.level + this._car3_shop);
    }

    public onBtnPauseClick () {
        AudioManager.instance.playSound(constant.SOUND.CLICK);

        uiManager.instance.showDialog("pause/pausePanel", [], ()=>{}, constant.PRIORITY.DIALOG);
        GameManager.isGamePause = true;
    }

    public onBtnMonsterRevClick () {
        let move_gold = playerData.instance.playerInfo.level + this._car1_shop;
        if (move_gold > playerData.instance.playerInfo.gold)
            return

        GameManager.addGold(-move_gold);
        AudioManager.instance.playSound(constant.SOUND.CLICK);
        let id = 1
        clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_REVIVE, id);
    }

    public onBtnMonsterRevClick2 () {
        let move_gold = playerData.instance.playerInfo.level + this._car2_shop;
        if (move_gold > playerData.instance.playerInfo.gold)
            return

        GameManager.addGold(-move_gold);
        AudioManager.instance.playSound(constant.SOUND.CLICK);
        let id = 2
        clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_REVIVE, id);
    }

    public onBtnMonsterRevClick3 () {
        let move_gold = playerData.instance.playerInfo.level + this._car3_shop;
        if (move_gold > playerData.instance.playerInfo.gold)
            return

        GameManager.addGold(-move_gold);
        AudioManager.instance.playSound(constant.SOUND.CLICK);
        let id = 3
        clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_REVIVE, id);
    }


    public onBtnDebugClick () {
        AudioManager.instance.playSound(constant.SOUND.CLICK);

        this._debugClickTimes += 1;

        if (this._debugClickTimes >= 1) {
            this._debugClickTimes = 0;
            uiManager.instance.showDialog("debug/debugPanel", [], ()=>{}, constant.PRIORITY.DIALOG);
        }
    }
}
