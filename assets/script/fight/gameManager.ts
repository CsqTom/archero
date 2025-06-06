import { EffectManager } from './../framework/effectManager';
import { clientEvent } from './../framework/clientEvent';
import { playerData } from './../framework/playerData';
import { Monster } from './monster';
import { uiManager } from './../framework/uiManager';
import { MapManager } from './mapManager';
import { _decorator, Component, Node, CameraComponent, Vec3, SkeletalAnimationComponent, ParticleSystemComponent, AnimationComponent, find, resources, Prefab, error, BoxColliderComponent, RigidBodyComponent, MeshRenderer, Mesh } from 'cc';
import { GameCamera } from './gameCamera';
import { Player } from './player';
import { resourceUtil } from '../framework/resourceUtil';
import { poolManager } from '../framework/poolManager';
import { constant } from '../framework/constant';
import { localConfig } from '../framework/localConfig';
import { Boss } from './boss';
import { AudioManager } from '../framework/audioManager';
import {RigidBody} from "cc";

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(GameCamera)
    public camera: GameCamera = null!;//相机组件

    @property({type: MapManager})
    public scriptMapManager: MapManager = null!;//地图脚本组件

    @property(Node)
    public ndLight: Node = null!; //主光源

    public mapInfo: any = {};//地图信息
    public arrMonsterSkill: any[] = [];//已经预加载的敌人技能

    public static mainCamera: CameraComponent | null = null;//相机组件
    public static isGameStart: boolean = false;//游戏是否开始
    public static isGamePause: boolean = false;//游戏是否暂停
    public static isGameOver: boolean = false;//游戏是否结束
    public static scriptPlayer: Player = null!;//玩家脚本
    public static scriptGameCamera: GameCamera;//相机脚本
    public static ndPlayer: Node = null!;//玩家节点
    public static arrPlayer: Node[] = []; //玩家数组
    public static ndBoss: Node = null!;//小怪节点
    public static scriptBoss: Boss = null!;//boss脚本
    public static ndGameManager: Node;//游戏全局管理节点
    public static ndEffectManager: Node = null!;//特效节点
    public static ndMapManager: Node = null!;//地图节点
    public static isRevive: boolean = false;//玩家是否复活
    public static isTesting: boolean = true;//是否开启测试代码
    public static isFirstLoad: boolean = false;//是否首次加载
    public static arrMonster: Node[] = []; //小怪、boss数组
    public static existentNum: number = 0;//本层加载的npc、大爱心现存数量（怪物不会和npc、大爱心同时出现，配置表格需注意）
    //本层敌人加成
    public static attackAddition: number = 1;//本层敌人攻击加成
    public static defenseAddition: number = 1;//本层敌人防御加成
    public static hpAddition: number = 1;//本层敌人生命加成
    public static moveSpeedAddition: number = 1;//本层敌人移速加成
    public static attackSpeedAddition: number = 1;//本层敌人攻速加成

    public static set isWin (value: boolean) {
        this._isWin = value;

        if (GameManager.isGameStart) {
            clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_GAME_OVER);            
        }
    }

    public static get isWin () {
        return this._isWin;
    }

    public static set gameSpeed (value: number) {
        console.log("gameSpeed",GameManager.gameSpeed);

        this._gameSpeed = value;
        GameManager.refreshEffectSpeed(GameManager.ndGameManager, this._gameSpeed);
        GameManager.refreshEffectSpeed(GameManager.ndPlayer as Node, this._gameSpeed);
        GameManager.refreshEffectSpeed(GameManager.ndEffectManager as Node, this._gameSpeed);
    };

    public static get gameSpeed () {
        return this._gameSpeed;
    }

    private _oriMainLightWorPos: Vec3 = null!;//主光源节点初始世界坐标
    private _offsetWorPosMainLight: Vec3 = new Vec3();//主光源和玩家的向量差

    private static _gameSpeed: number = 1;//游戏速度
    private static _isWin: boolean = false;//是否取得胜利

    private _countdownTimer: any = null;// 倒计时计时器引用
    private _countdownValue: number = 0;// 倒计时剩余时间

    private _card1Count: number = 0;
    private _card2Count: number = 0;
    private _card3Count: number = 0;
    private _card2name: string = "magician";
    private _playerGold: number = 0;//玩家金币

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.ON_GAME_INIT, this._onGameInit, this);
        clientEvent.on(constant.EVENT_TYPE.ON_GAME_OVER, this._onGameOver, this);
        clientEvent.on(constant.EVENT_TYPE.ON_GAME_PAUSE, this._onGamePause, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_LEVEL, this._refreshLevel, this);
        clientEvent.on(constant.EVENT_TYPE.RECYCLE_ALL, this._recycleAll, this);
        clientEvent.on(constant.EVENT_TYPE.MONSTER_REVIVE, this._revPlayerMonster, this);
        clientEvent.on(constant.EVENT_TYPE.ON_REVIVE, this._revAllPlayMonster, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.ON_GAME_INIT, this._onGameInit, this);
        clientEvent.off(constant.EVENT_TYPE.ON_GAME_OVER, this._onGameOver, this);
        clientEvent.off(constant.EVENT_TYPE.ON_GAME_PAUSE, this._onGamePause, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_LEVEL, this._refreshLevel, this);
        clientEvent.off(constant.EVENT_TYPE.RECYCLE_ALL, this._recycleAll, this);
        clientEvent.off(constant.EVENT_TYPE.MONSTER_REVIVE, this._revPlayerMonster, this);
        clientEvent.off(constant.EVENT_TYPE.ON_REVIVE, this._revAllPlayMonster, this);
    }

    start () {
        GameManager.mainCamera = this.camera?.getComponent(CameraComponent) as CameraComponent;
        GameManager.scriptGameCamera = this.camera?.getComponent(GameCamera) as GameCamera;
        GameManager.ndGameManager = this.node;
        GameManager.ndMapManager = find("mapManager") as Node;
        GameManager.ndEffectManager = find("effectManager") as Node;

        this._oriMainLightWorPos = this.ndLight.worldPosition.clone();

        if (GameManager.isTesting) {
            //@ts-ignore
            window.uiManager = uiManager.instance;      
            //@ts-ignore
            window.AudioManager = AudioManager.instance;
            //@ts-ignore
            window.playerData = playerData.instance;
            //@ts-ignore
            window.clientEvent = clientEvent;      
            //@ts-ignore
            window.ndGameManager = GameManager.ndGameManager;
            //@ts-ignore
            window.GameManager = GameManager;
            //@ts-ignore
            window.ndMapManager = GameManager.ndMapManager;
            //@ts-ignore
            window.EffectManager = EffectManager.instance;
            //@ts-ignore
            window.ndEffectManager = GameManager.ndEffectManager;
            //@ts-ignore
            window.constant = constant;
            //@ts-ignore
            //@ts-ignore
        }
    }

    /**
     * 初始化游戏
     */
    private _onGameInit () {   
        let level = playerData.instance.playerInfo.level;

        let totalLevel = localConfig.instance.getTableArr("checkpoint").length;
        //游戏通关后从倒数第10关开始循环(61-70)
        if (level > totalLevel) {
            level = (totalLevel - 10) + (level - totalLevel) % 10;  
        } 
        
        this.mapInfo = localConfig.instance.queryByID("checkpoint", String(level));
        //设置本层敌人属性加成比例
        GameManager.attackAddition = this.mapInfo.attackAddition;
        GameManager.defenseAddition = this.mapInfo.defenseAddition;
        GameManager.hpAddition = this.mapInfo.hpAddition;
        GameManager.moveSpeedAddition = this.mapInfo.moveSpeedAddition;
        GameManager.attackSpeedAddition = this.mapInfo.attackSpeedAddition;

        uiManager.instance.showDialog("loading/loadingPanel");

        clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_WARP_GATE);

        GameManager.isGameStart = false;
        GameManager.isGamePause = false;
        GameManager.isGameOver = false;    
        GameManager.isWin = false;
        GameManager.isRevive = false;
        GameManager.arrMonster = [];
        GameManager.gameSpeed = 1;
        GameManager.ndBoss = null!;
        GameManager.existentNum = 0;

        this._card1Count = this._card2Count = this._card3Count = 0;
        this._playerGold = playerData.instance.playerInfo.gold

        playerData.instance.addFightTimes();

        AudioManager.instance.pauseAll();

        this._refreshLevel();

        // 在刷新关卡后开始倒计时（根据实际需求调整位置）
        this._startGameCountdown(); // <-- 新增倒计时
    }

    /**
     * 开始游戏倒计时
     */
     private _startGameCountdown() {
        // 显示倒计时UI（需要先在uiManager中实现对应的面板）
        // uiManager.instance.showDialog("countdown/countdownPanel");

        this._countdownValue = 5; // 倒计时N秒
        GameManager.isGameStart = false;

        // 每秒更新一次倒计时
        this._countdownTimer = setInterval(() => {
            this._countdownValue--;

            // 更新倒计时显示
            // clientEvent.dispatchEvent(constant.EVENT_TYPE.UPDATE_COUNTDOWN, this._countdownValue);

            if (this._countdownValue <= 0) {
                clearInterval(this._countdownTimer);
                this._countdownTimer = null;

                // 隐藏倒计时UI
                // uiManager.instance.hideDialog("countdown/countdownPanel");

                // 设置游戏开始状态
                if (!GameManager.isGameStart) {
                    GameManager.isGameStart = true;
                    AudioManager.instance.resumeAll();
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_MOVE);
                    console.log("游戏正式开始！");
                }
            }
        }, 1000);
    }

    /**
     * 刷新关卡, 后期优化写法。。。
     */
    private _refreshLevel () {
        for (let i = 0; i < GameManager.arrPlayer.length; i++) {
            if (!GameManager.arrPlayer[i].getComponent(Monster)?.isDie) {
                switch (GameManager.arrPlayer[i].getComponent(Monster)?.node.name) {
                    case "aula":
                        this._card1Count++;
                        break;
                    case this._card2name:
                        this._card2Count++;
                        break;
                    case 'dragon':
                        this._card3Count++;
                        break;
                    default:
                        break;
                }
            }
        }

        //每层随机一张地图
        let arrMap = this.mapInfo.mapName.split("#");
        let mapName = arrMap[Math.floor(Math.random() * arrMap.length)];
        
        this.preloadMonsterSkill(mapName).then(()=>{
            this._recycleAll();
            this._loadMap(mapName, ()=>{
                //第一次进入或者失败后被销毁需要重新创建
                if (!GameManager.ndPlayer) {
                    this._createPlayer();
                } else {
                    GameManager.scriptPlayer.resetPlayerState();

                    // 清除现有小怪节点
                    GameManager.arrPlayer.forEach(monster => {
                        poolManager.instance.putNode(monster);
                    });
                    GameManager.arrPlayer = [];

                    // 重新创建原有数量的小怪
                    for(let i = 0; i < this._card1Count; i++) {
                        this._createAula();
                    }
                    for(let i = 0; i < this._card2Count; i++) {
                        this._createMagician();
                    }
                    for(let i = 0; i < this._card3Count; i++) {
                        this._createDragon();
                    }

                    clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_LOADING_PANEL);
                }
            });
        })
    }

    /**
     * 加载地图数据
     *
     * @private
     * @param {Function} [cb=()=>{}]
     * @memberof GameManager
     */
    private _loadMap (mapName: string, cb: Function = ()=>{}) {   
        this.scriptMapManager.buildMap(mapName, ()=>{}, ()=>{
            cb && cb();
        })
    }

    /**
     * 创建玩家
     *
     * @private
     * @memberof GameManager
     */
    private _createPlayer () {
        resourceUtil.loadModelRes("player/player01").then((pf: any)=>{
            GameManager.ndPlayer = poolManager.instance.getNode(pf, this.node) as Node;
            
            let scriptGameCamera = GameManager.mainCamera?.node.getComponent(GameCamera) as GameCamera;
            scriptGameCamera.ndFollowTarget = GameManager.ndPlayer;

            let scriptPlayer = GameManager.ndPlayer?.getComponent(Player) as Player;
            GameManager.scriptPlayer = scriptPlayer;
            scriptPlayer?.init();

            //初次进入的时候需要预加载弓箭
            if (GameManager.isFirstLoad) {
                GameManager.isFirstLoad = false;

                scriptPlayer.preloadArrow(()=>{
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_LOADING_PANEL);
                })
            } else {
                clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_LOADING_PANEL);
            }
        })
    }

    private _createAula(is_move: boolean=false) {
        // 创建玩家的小怪
        resourceUtil.loadModelRes("monster/aula").then((pf: any)=>{
            let ndChild = poolManager.instance.getNode(pf, this.node, true) as Node;
            GameManager.arrPlayer.push(ndChild as Node);

            let baseInfo = localConfig.instance.queryByID("base", constant.BASE.AULA);

            // let position = baseInfo.position.split(',');
            let angle = baseInfo.angle.split(',');
            let scale = baseInfo.scale.split(',');
            // ndChild.setPosition(new Vec3(Number(position[0]), Number(position[1]), Number(position[2])));
            ndChild.eulerAngles = new Vec3(Number(angle[0]), Number(angle[1]), Number(angle[2]));
            ndChild.setScale(new Vec3(Number(scale[0]), Number(scale[1]), Number(scale[2])));
            // x前位置，越大超向前； y水平,越小越高； z左右位置，0为中间，负数为左，正数为右
            ndChild.setPosition(new Vec3(-9.65+ (Math.random() * 6 - 3),1.65 , -3 + (Math.random() * 6 - 3)));

            let rigidBody = ndChild.getComponent(RigidBody) as RigidBody;
            rigidBody.setGroup(constant.PHY_GROUP.PLAYER)

            let layinfo = {
                ID: "2001",
                position: "-8.65,1.65, 0",
                angle: "",
                scale:"",
                skill:"102",
                movePattern: 1
            }
            ndChild.getComponent(Monster)?.init(baseInfo, layinfo);

            if (is_move) {
                clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_MOVE);
            }
        })
    }

    private _createMagician(is_move: boolean=false) {
        // 创建玩家的小怪
        resourceUtil.loadModelRes("monster/magician").then((pf: any)=>{
            let ndChild = poolManager.instance.getNode(pf, this.node, true) as Node;
            GameManager.arrPlayer.push(ndChild as Node);

            let baseInfo = localConfig.instance.queryByID("base", constant.BASE.MAGICIAN);

            // let position = baseInfo.position.split(',');
            let angle = baseInfo.angle.split(',');
            let scale = baseInfo.scale.split(',');
            // ndChild.setPosition(new Vec3(Number(position[0]), Number(position[1]), Number(position[2])));
            ndChild.eulerAngles = new Vec3(Number(angle[0]), Number(angle[1]), Number(angle[2]));
            ndChild.setScale(new Vec3(Number(scale[0]), Number(scale[1]), Number(scale[2])));
            ndChild.setPosition(new Vec3(-9.65 + Math.random() * 6 - 3, 1.65, 3 + (Math.random() * 6 - 3)));

            let rigidBody = ndChild.getComponent(RigidBody) as RigidBody;
            rigidBody.setGroup(constant.PHY_GROUP.PLAYER)

            let layinfo = {
                ID: "2003",
                position: "-12.65,1.65, 3",
                angle: "",
                scale:"",
                skill:"106",
                movePattern: 1
            }
            ndChild.getComponent(Monster)?.init(baseInfo, layinfo);

            if (is_move) {
                clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_MOVE);
            }
        })
    }

    private _createDragon(is_move: boolean=false) {
        // 创建玩家的小怪
        resourceUtil.loadModelRes("boss/dragon").then((pf: any)=>{
            let ndChild = poolManager.instance.getNode(pf, this.node, true) as Node;
            GameManager.arrPlayer.push(ndChild as Node);

            let baseInfo = localConfig.instance.queryByID("base", constant.BASE.BOSS_01);

            // let position = baseInfo.position.split(',');
            let angle = baseInfo.angle.split(',');
            let scale = baseInfo.scale.split(',');
            // ndChild.setPosition(new Vec3(Number(position[0]), Number(position[1]), Number(position[2])));
            ndChild.eulerAngles = new Vec3(Number(angle[0]), Number(angle[1]), Number(angle[2]));
            ndChild.setScale(new Vec3(Number(scale[0]), Number(scale[1]), Number(scale[2])));
            ndChild.setPosition(new Vec3(-8.65 + Math.random() * 6 - 3, 1.65, 0.1 + (Math.random() * 6 - 3)));

            let rigidBody = ndChild.getComponent(RigidBody) as RigidBody;
            rigidBody.setGroup(constant.PHY_GROUP.PLAYER)

            let layinfo = {
                ID: "3001",
                position: "-12.65,1.65, 3",
                angle: "",
                scale:"",
                skill:"103#106",
                movePattern: 2
            }
            ndChild.getComponent(Boss)?.init(baseInfo, layinfo);

            if (is_move) {
                clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_MOVE);
            }
        })
    }

    private _createHellFire(is_move: boolean=false) {
        // 创建玩家的小怪
        resourceUtil.loadModelRes("monster/hellFire").then((pf: any)=>{
            let ndChild = poolManager.instance.getNode(pf, this.node, true) as Node;
            GameManager.arrPlayer.push(ndChild as Node);

            let baseInfo = localConfig.instance.queryByID("base", constant.BASE.HELL_FIRE);

            // let position = baseInfo.position.split(',');
            let angle = baseInfo.angle.split(',');
            let scale = baseInfo.scale.split(',');
            // ndChild.setPosition(new Vec3(Number(position[0]), Number(position[1]), Number(position[2])));
            ndChild.eulerAngles = new Vec3(Number(angle[0]), Number(angle[1]), Number(angle[2]));
            ndChild.setScale(new Vec3(Number(scale[0]), Number(scale[1]), Number(scale[2])));
            ndChild.setPosition(new Vec3(-10.65,1.65, -3));

            let rigidBody = ndChild.getComponent(RigidBody) as RigidBody;
            rigidBody.setGroup(constant.PHY_GROUP.PLAYER)

            let layinfo = {
                ID: "2004",
                position: "-10.65,1.65, -3",
                angle: "",
                scale:"",
                skill:"104",
                movePattern: 1
            }
            ndChild.getComponent(Monster)?.init(baseInfo, layinfo);

            if (is_move) {
                clientEvent.dispatchEvent(constant.EVENT_TYPE.MONSTER_MOVE);
            }
        })
    }

    private _revPlayerMonster (id: number) {
        if (GameManager.isGameOver) {
            return;
        }
        switch (id) {
            case 1:
                // 创建玩家的小怪, 并马上行动
                this._createAula(true);
                break;
            case 2:
                this._createMagician(true);
                break;
            case 3:
                this._createDragon(true);
                break;
            default:
                break;
        }
    }

    private _revAllPlayMonster() {
        playerData.instance.playerInfo.gold = this._playerGold;
        clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_GOLD);

        // 清除现有小怪节点
        GameManager.arrPlayer.forEach(monster => {
            poolManager.instance.putNode(monster);
        });
        GameManager.arrPlayer = [];

        // 重新创建原有数量的小怪
        for(let i = 0; i < this._card1Count; i++) {
            this._createAula();
        }
        for(let i = 0; i < this._card2Count; i++) {
            this._createMagician();
        }
        for(let i = 0; i < this._card3Count; i++) {
            this._createDragon();
        }
        this._createAula(true);//复活多送一只
    }


    /**
     * 回收怪兽, 武器，特效等
     *
     * @private
     * @memberof GameManager
     */
    private _recycleAll () {
        this.scriptMapManager.recycle();

        for (let i = this.node.children.length - 1; i >= 0; i--) {
            const ndChild = this.node.children[i];

            let rigidBody = ndChild.getComponent(RigidBody) as RigidBody;
            if (rigidBody) {
                if (rigidBody.getGroup() !== constant.PHY_GROUP.PLAYER) {
                    poolManager.instance.putNode(ndChild);
                }
            } else if (ndChild.name !== "player01") {
                poolManager.instance.putNode(ndChild);
            }
        }

        while(GameManager.ndEffectManager.children.length) {
            poolManager.instance.putNode(GameManager.ndEffectManager.children[0]);
        }
    }

    /**
     * 游戏结束
     */
    private _onGameOver () {
        if (GameManager.isGameOver) {
            return;
        }

        GameManager.isGamePause = true;

        console.log("game over!", "isWin ?", GameManager.isWin);

        uiManager.instance.hideDialog("fight/fightPanel");

        if (GameManager.isWin) {
            GameManager.isGameOver = true;

            this._recycleAll();

            let nextLevel = Number( playerData.instance.playerInfo.level) + 1;
            playerData.instance.playerInfo.level = nextLevel;

            //更新已解锁最高层级
            if (nextLevel > playerData.instance.playerInfo.highestLevel) {
                playerData.instance.playerInfo.highestLevel = nextLevel;
            }

            clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_GAME_INIT);
        } else {            
            uiManager.instance.showDialog("revive/revivePanel", [()=>{
                if (GameManager.ndPlayer) {
                    poolManager.instance.putNode(GameManager.ndPlayer);
                    GameManager.ndPlayer = null!;
                    GameManager.scriptPlayer = null!;
                }

                this._recycleAll();
            }]);
        }
    }

    /**
     * 游戏暂停
     */
    private _onGamePause () {
        GameManager.isGamePause = true;
    }

    /**
     * 获取距离最近的小怪、boss节点
     * @returns 
     */
    public static getNearestMonster () {
        if (GameManager.arrMonster.length) {
            let offsetA: Vec3 = new Vec3();
            let offsetB: Vec3 = new Vec3();
    
            let playerWorPos = GameManager.ndPlayer?.worldPosition as Vec3;
            let arr = GameManager.arrMonster.sort((a: any, b: any)=>{
                let distanceA = Vec3.subtract(offsetA, playerWorPos, a.worldPosition).length();
                let distanceB = Vec3.subtract(offsetB, playerWorPos, b.worldPosition).length();
                return  distanceA - distanceB;
            })
    
            arr = arr.filter((item: Node)=>{
                let scriptMonster = item.getComponent(Monster) as Monster;
                return item.parent !== null && !scriptMonster.isDie;
            })

            return arr[0];
        } else if (GameManager.ndBoss && !GameManager.scriptBoss.isDie) {
            return GameManager.ndBoss;
        } else {
            return null;
        }
    }

    /**
     * 获取除了怪物本身自己外一定范围内的怪物
     *
     * @static
     * @param {Node} ndMonster 被击中的敌人
     * @param {boolean} [isAll=false] 是否返回全部敌人,否则只随机返回一个
     * @param {number} [range=5] 范围
     * @return {*} 
     * @memberof GameManager
     */
    public static getNearbyMonster (ndMonster: Node, isAll: boolean = false, range: number = 5) {
        //范围
        let arrMonster: any[] = [];
        let offsetPos: Vec3 = new Vec3();

        if (GameManager.arrMonster.length) {
            arrMonster = GameManager.arrMonster.concat();
        } 

        if (GameManager.ndBoss) {
            arrMonster.push(GameManager.ndBoss);
        } 

        arrMonster = arrMonster.filter((item: Node)=>{
            let scriptMonster = item.getComponent(Monster) as Monster;
            Vec3.subtract(offsetPos, ndMonster.worldPosition, item.worldPosition);
            return item.parent !== null && !scriptMonster.isDie && offsetPos.length() <= range && ndMonster.worldPosition !== item.worldPosition;
        })

        if (arrMonster.length) {
            if (!isAll) {
                let index = Math.floor(Math.random() * arrMonster.length);
                return arrMonster = arrMonster.filter((ndChild: Node, idx: number)=>{
                    return idx === index;
                })
            } else {
                return arrMonster;
            }
        } else {
            return arrMonster;
        }
    }

    /**
     * 刷新自节点的动画、粒子播放速度
     * @param targetNode 
     * @param value 
     * @returns 
     */
     public static refreshEffectSpeed (targetNode: Node, value: number) {
        if (!targetNode) {
            return;
        }   
        let arrAni = targetNode.getComponentsInChildren(AnimationComponent);
        arrAni.forEach((item: AnimationComponent)=>{
            item.clips.forEach((clip: any)=>{
                let aniName = clip?.name as string
                let aniState = item.getState(aniName);
                aniState.speed = value;
            })
        })

        let arrSkeletalAni = targetNode.getComponentsInChildren(SkeletalAnimationComponent);
        arrSkeletalAni.forEach((item: SkeletalAnimationComponent)=>{
            item.clips.forEach((clip: any)=>{
                let aniName = clip?.name as string
                let aniState = item.getState(aniName);
                aniState.speed = value;
            })
        })

        let arrParticle = targetNode.getComponentsInChildren(ParticleSystemComponent);
        arrParticle.forEach((item: ParticleSystemComponent)=>{
            item.simulationSpeed = value;
        })
    }

    /**
     * 添加钻石
     *
     * @static
     * @param {number} [value=1]
     * @memberof GameManager
     */
    public static addGold (value: number = 1) {
        playerData.instance.updatePlayerInfo('gold', Math.ceil(value));
        clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_GOLD);
    }

    /**
     * 每层进入前预加载该层所需的敌人技能
     *
     * @private
     * @memberof GameManager
     */
    public preloadMonsterSkill (arrName: string) {
        return new Promise((resolve, reject)=>{
            let arrLoadSkill: string[] = [];//等待预加载的技能
            let arrInfo = localConfig.instance.getTableArr(arrName);
            //获取所有敌人信息
            arrInfo = arrInfo.filter((item: any)=>{
                return item.ID.startsWith("2");
            })

            //获得敌人技能
            if (arrInfo.length) {
                arrInfo.forEach((element: any) => {
                    let arrSkill = element.skill === "" ? [] : element.skill.split("#");
                    arrSkill.length && arrSkill.forEach((id: string) => {
                        if (this.arrMonsterSkill.indexOf(id) === -1) {
                            this.arrMonsterSkill.push(id);
                            arrLoadSkill.push(id);
                        }
                    });            
                });

                let arrPromise = [];
                if (arrLoadSkill.length) {
                    for (let i = 0; i < arrLoadSkill.length; i++) {
                        const element = arrLoadSkill[i];  
                        //预加载敌人技能
                        let skillInfo = localConfig.instance.queryByID("monsterSkill", element);
                        let p = resourceUtil.loadEffectRes(`${skillInfo.resName}/${skillInfo.resName}`).then((prefab: any)=>{
                            let ndSkillCollider = poolManager.instance.getNode(prefab, GameManager.ndGameManager as Node) as Node;
                            ndSkillCollider.setWorldPosition(this.node.worldPosition.x, 30, this.node.worldPosition.z);
                        })
                        arrPromise.push(p);
                    }
        
                    Promise.all(arrPromise).then(()=>{
                        resolve(null);
                    }).catch((e: any)=>{
                        console.error("预加载敌人技能报错", e);
                    })
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        })
    }

    /**
     * 判断本层的爱心、npc是否都已经触发
     *
     * @static
     * @memberof GameManager
     */
    public static checkTriggerAll () {
        GameManager.existentNum -= 1;

        if (GameManager.existentNum <= 0) {
            clientEvent.dispatchEvent(constant.EVENT_TYPE.SHOW_WARP_GATE);
        }
    }

    update (deltaTime: number) {
         //光源跟随玩家人物移动
         if (GameManager.scriptPlayer && GameManager.scriptPlayer.node && !GameManager.isGameOver) {
            Vec3.subtract(this._offsetWorPosMainLight, GameManager.ndPlayer.worldPosition, this._oriMainLightWorPos);
            this._offsetWorPosMainLight.set(this._offsetWorPosMainLight.x, 0, this._offsetWorPosMainLight.z);
            this.ndLight.setWorldPosition(this._offsetWorPosMainLight.add(this._oriMainLightWorPos));
        }
    }
}
