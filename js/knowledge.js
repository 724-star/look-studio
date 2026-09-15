/* ═══════════════════════════════════════════════════════════
   LOOK STUDIO · 穿搭知识引擎 + 拍摄指导生成器
   纯本地规则引擎：色彩策略 / 身形扬长避短 / 场景逻辑 / 风格库
   ═══════════════════════════════════════════════════════════ */
window.LOOK = (() => {

  /* ── 基础数据 ─────────────────────────────────────── */

  const COLORS = {
    black:  { name:'黑色',     sw:'#17140F', fam:'neutral' },
    white:  { name:'纯白',     sw:'#F4F1E8', fam:'neutral' },
    cream:  { name:'奶白/米',  sw:'#EDE2CE', fam:'neutral' },
    grey:   { name:'灰色',     sw:'#9A958C', fam:'neutral' },
    camel:  { name:'卡其/驼',  sw:'#C19A6B', fam:'neutral' },
    brown:  { name:'棕/咖',    sw:'#7A5230', fam:'neutral' },
    denim:  { name:'牛仔蓝',   sw:'#4E6A8A', fam:'neutral' },
    navy:   { name:'藏青/深蓝',sw:'#26364C', fam:'neutral' },
    blue:   { name:'亮蓝色系', sw:'#3B6FD4', fam:'cool' },
    purple: { name:'紫色系',   sw:'#7C5FA8', fam:'cool' },
    green:  { name:'绿色系',   sw:'#4E7C4A', fam:'cool' },
    red:    { name:'红色系',   sw:'#B4372C', fam:'warm' },
    pink:   { name:'粉色系',   sw:'#D98A9C', fam:'warm' },
    yellow: { name:'黄/橙色系',sw:'#D9962E', fam:'warm' },
    multi:  { name:'格纹/条纹/印花', sw:'', fam:'pattern' },
  };
  const NEUTRAL_KEYS = ['black','white','cream','grey','camel','brown','denim','navy'];

  const CATEGORIES = [
    { key:'shirt',  name:'衬衫',        slot:'top' },
    { key:'tee',    name:'T恤',         slot:'top' },
    { key:'knit',   name:'针织衫/毛衣', slot:'top' },
    { key:'hoodie', name:'卫衣',        slot:'top' },
    { key:'vest',   name:'背心/吊带',   slot:'top' },
    { key:'blazer', name:'西装外套',    slot:'outer' },
    { key:'coat',   name:'风衣/大衣',   slot:'outer' },
    { key:'jacket', name:'牛仔/休闲外套', slot:'outer' },
    { key:'puffer', name:'羽绒服/棉服', slot:'outer' },
    { key:'dress',  name:'连衣裙',      slot:'dress' },
    { key:'skirt',  name:'半身裙',      slot:'bottom' },
    { key:'pants',  name:'裤装',        slot:'bottom' },
    { key:'shoes',  name:'鞋子',        slot:'shoes' },
    { key:'acc',    name:'包/配饰',     slot:'acc' },
  ];

  const FITS = [
    { key:'loose',  name:'宽松' },
    { key:'std',    name:'标准' },
    { key:'slim',   name:'修身' },
    { key:'short',  name:'短款' },
    { key:'long',   name:'长款' },
  ];

  /* tex：软(soft) / 挺括(hard) / 中性(mid) —— 材质层次逻辑用 */
  const MATERIALS = [
    { key:'cotton',  name:'棉质',    tex:'soft' },
    { key:'knit',    name:'针织',    tex:'soft' },
    { key:'chiffon', name:'雪纺/纱', tex:'soft' },
    { key:'silk',    name:'真丝',    tex:'soft' },
    { key:'linen',   name:'棉麻',    tex:'soft' },
    { key:'denim',   name:'牛仔',    tex:'hard' },
    { key:'leather', name:'皮革',    tex:'hard' },
    { key:'suit',    name:'西装料',  tex:'hard' },
    { key:'corduroy',name:'灯芯绒',  tex:'mid'  },
    { key:'wool',    name:'羊毛/呢', tex:'mid'  },
  ];

  const SEASONS = [
    { key:'spring', name:'春秋' }, { key:'summer', name:'夏天' },
    { key:'winter', name:'冬天' }, { key:'any',    name:'看情况' },
  ];

  const SCENES = {
    commute: { name:'通勤上班', en:'COMMUTE',
      tone:'克制、利落、低饱和——办公室的信任感是“穿得像能扛事”',
      logic:['通勤的高级感来自“少”：全身不超过 3 个颜色，配饰只留 1-2 件','挺括面料（西装料、衬衫料）比软塌面料更显专业，垂感直线最省事'],
      light:{ best:'上午 10 点前的落地窗侧光，或下午 4 点后的西窗光', how:['人侧对窗 45° 站，鼻梁一侧亮一侧暗，脸立刻立体','办公室顶灯是“平光”，只用来补亮，别当主光'] },
      bg:['写字楼大堂的石材墙或走廊尽头（线条从下往上拉透视）','窗边：让窗外天空过曝变白，天然影棚背景'],
      pits:['玻璃幕墙会反射出“鬼影”，离玻璃 1 米以上再拍','电梯间的镜面最容易穿帮——按快门前扫一眼画面四角'] },
    date: { name:'约会', en:'DATE',
      tone:'柔软材质、暖色调、一点曲线感——有温度，但不用力',
      logic:['约会装的要点是“想靠近”：针织、纱、灯芯绒这类看起来就软的材质','留一件女性化元素（裙摆/珍珠/丝巾）就够，多则腻'],
      light:{ best:'日落前 1 小时的黄金时刻，逆光拍发丝都在发光', how:['让光从侧后方来，对脸点按对焦并稍微拉高曝光','阴天是天然柔光箱，肤色会显得特别匀净'] },
      bg:['咖啡馆落地窗边（借窗外光 + 暖色室内氛围）','街边小店门口、有绿植或暖色招牌的一侧'],
      pits:['逆光太猛会拍成“黑脸”，记得对焦在脸上并提亮','餐厅暖黄灯显黄——把相机白平衡往“阴天”拨一格试拍对比'] },
    campus: { name:'校园上课', en:'CAMPUS',
      tone:'松弛减龄——牛仔、卫衣、帆布鞋的舒服哲学',
      logic:['校园装的灵魂是“不费力的好看”：基础款 + 一个小心机（袜子颜色/发夹/包）','行动方便是底线：能跑着赶课的搭配才是好搭配'],
      light:{ best:'上午课间的教学楼窗边侧光，顺光不刺眼', how:['靠窗坐直接用桌面的反光补脸','楼道逆光能拍出发丝光，适合回眸抓拍'] },
      bg:['操场看台、跑道（颜色干净、线条感强）','图书馆书架间、教学楼走廊（纵深透视）'],
      pits:['教室顶灯是冷白光，和窗外光混在一起肤色发青——尽量单光源','体育馆彩钢墙颜色抢镜，人离墙 2 米以上'] },
    travel: { name:'旅行出片', en:'TRAVEL',
      tone:'层次丰富、上镜色、舒适鞋——好看和走得动都要',
      logic:['旅行照的搭配要在“背景色”里跳出来：景点是蓝海就带暖白/红，是绿野就带米白','全身至少一个层次：外套披肩上、 sweater 搭肩上，画面就有故事'],
      light:{ best:'日出后 1 小时 / 日落前 1 小时；蓝调时刻拍夜景人像绝了', how:['正午硬光躲进建筑物阴影的边缘，让阴影边缘的“漫射光”打脸','帽子既是造型也是控光工具'] },
      bg:['地标侧面而非正下方（透视不畸形，人也全）','当地有代表性的墙面/门/窗——纹理背景最上片'],
      pits:['地标放头顶=头像合影式翻车，人往侧面挪两步','白色景点 + 正午顶光 = 脸部死黑，务必侧身或补光'] },
    mall: { name:'逛街探店', en:'CITY WALK',
      tone:'潮流感、叠穿、一个记忆点——街拍感是“随手但讲究”',
      logic:['逛街装的逻辑是“移动中好看”：比例要利落，裙长裤长别拖地','一个记忆点（亮眼配饰/特殊版型）比全身都用力高级'],
      light:{ best:'店铺门口的白光灯下最稳，橱窗灯当轮廓光', how:['让朋友举手机屏幕白光补脸（夜间）','雨后的路面是天然反光板'] },
      bg:['干净的店铺卷帘门前、街头转角（简洁背景突出人）','有纵深的小巷/台阶，制造空间感'],
      pits:['橱窗彩色灯让肤色发绿发紫——选白光店铺门口拍','玻璃地面反光会拍出“悬浮感”，注意机位角度'] },
    shoot: { name:'博主感拍照', en:'LOOKBOOK',
      tone:'视觉焦点、廓形、成组配色——每一张都是一张“页”',
      logic:['博主感的核心是“统一”：一套搭配一个主色 + 一个辅助色，绝不加第三色','廓形放大一号：oversize 上衣、阔腿裤，镜头会吃掉 10% 的量感'],
      light:{ best:'上午侧光 + 白墙反光板，或黄昏黄金时刻', how:['同个场景换 3 个机位：正面全身 / 45° 半身 / 侧面特写，成组才像 lookbook','逆光 + 对焦脸 + 提曝光 = 自带滤镜'] },
      bg:['纯色墙面（奶油/水泥灰/砖红）——博主感最高的性价比背景','楼梯、栏杆、有几何感的建筑局部'],
      pits:['同一个姿势只拍一张必废——每个姿势连拍 3 张挑神态','构图不留白后期没法裁：全身照四周留 10% 空间'] },
    generic: { name:'通用日常', en:'DAILY',
      tone:'干净、合身、有一个小亮点',
      logic:['先保证“合身 + 干净”，再谈风格——这两点占好看的 80%','每天出门前照全身镜看一眼比例：腰线在哪、裤长到哪'],
      light:{ best:'白天靠窗的漫射光，怎么拍都稳', how:['避免正午头顶直射光','室内尽量站在唯一的大窗旁边'] },
      bg:['干净的墙面前、楼下绿化带旁（虚化后就是色块）','台阶、栏杆边——自带构图线条'],
      pits:['背景越乱，人越不突出：拍之前看一眼身后','别在黄色路灯下拍人，肤色会发蜡黄'] },
  };

  const BODIES = {
    pear:      { name:'梨形 · 下半身丰满', do:['视觉重心上移：上装用浅色/图案/亮色配饰，下装收进深色','下装只认 A 字裙、直筒裤、阔腿裤——胯部有富余量才不显宽','外套长度选“结束在腰线”或“超过臀部最宽处”，别卡在胯上'], dont:['紧身裤包胯、臀部有大口袋/绣花','超短上衣 + 低腰裤的组合'] },
    apple:     { name:'苹果型 · 腰腹圆润', do:['V 领 + 长项链，把视线纵向拉长','选垂坠面料和直线条剪裁，面料“挂”在身上而不是“绷”在身上','连衣裙选直筒/H 型，或上短下长把腰线提到肋骨下'], dont:['腰间 anything：腰包、腰带上衣、束腰外套','紧身针织衫直接勾勒腹部'] },
    hourglass: { name:'沙漏 · 有腰有曲线', do:['大方展示腰线：塞衣角、系腰带、收腰连衣裙','面料贴合但不紧绷，曲线是优势别藏'], dont:['全身 oversize 直筒——把你最好的资本全埋了','腰部堆叠的设计（褶皱/荷叶边集中在腰腹）'] },
    rectangle: { name:'H 型 · 腰线不明显', do:['腰带是性价比最高的“曲线制造机”，系在肋骨下方','叠穿制造层次：内搭 + 开衫 + 外套，身体轮廓变立体','泡泡袖、阔腿裤这类“加量”单品，能造出假曲线'], dont:['从头到脚的直筒宽松——会显得“没有形状”'] },
    shoulder:  { name:'倒三角 · 肩宽背厚', do:['V 领 / U 领纵向破开肩宽','下装加量感做平衡：A 字长裙、阔腿裤','软面料（针织、雪纺）柔和肩线'], dont:['垫肩、西装大翻领、肩部泡泡袖','横条纹 / 肩部有装饰的上衣'] },
    petite:    { name:'小个子 · 155 上下', do:['高腰线是命：上衣塞进高腰下装， 3:7 比例立刻出现','同色系顺色穿（奶白 × 驼色），纵向无缝显高 5 厘米','外套选短款；裤长九分露脚踝；拍照机位放低'], dont:['超长裙 / 长大衣压个子','全身多层级叠穿（视觉被切碎）','低腰裤——比例杀手第一名'] },
    shortLegs: { name:'腿短 / 比例焦虑', do:['铁律：上短下长——短上衣 + 高腰裤/裙','鞋和下装同色顺延（黑裤 + 黑鞋），腿长从鞋头开始算','露脚踝：九分裤 + 低帮鞋'], dont:['长上衣直接盖过胯 + 直筒裤','裤脚堆积在鞋面'] },
    plus:      { name:'微胖 · 想显瘦', do:['直线条 + 微宽松（比身体大一码，不是大三码）','同色系纵向穿搭拉长身形，深色不必全黑——藏青、深咖都行','V 领 + 七分袖：露出的部分都是你最瘦的地方'], dont:['过度紧身（勾勒每一处曲线）和过度宽松（整个人膨胀）','密集大图案、横条纹宽条'] },
  };

  const SKINS = {
    cool:    { name:'冷白皮', tip:['清冷色系是主场：雾蓝、薰衣草紫、玫瑰粉、正白','避免大面积荧光色——会显得气色发灰'] },
    warm:    { name:'自然黄皮', tip:['显白三宝：雾霾蓝、正红、焦糖驼','白色选“奶白”不选“冷白”，对比太强显黄','远离荧光绿、荧光橙，黄皮穿它们像生病'] },
    deep:    { name:'小麦/健康深肤', tip:['高饱和色是你的主场：正红、亮橙、纯白、驼色，穿出来最有生命力','避开灰蒙蒙的中间调（灰粉、灰蓝），容易显得没精神'] },
    unknown: { name:'不确定', tip:['黑白灰 + 牛仔蓝 + 奶白，闭眼买不出错的“安全五色”'] },
  };

  const STYLES = {
    minimal: { name:'简约基础', en:'MINIMAL', keys:['剪裁','无彩色','少即是多'],
      shoes:['小白鞋','乐福鞋','德训鞋'], outer:['西装外套','针织开衫','风衣'],
      bottom:['米白阔腿裤','直筒牛仔裤','西装直筒裤'], top:['纯色 T 恤','条纹针织'],
      acc:['金属细项链','皮质腋下包','腕表'], dress:['衬衫式连衣裙','针织直筒连衣裙'] },
    sweet:   { name:'温柔甜美', en:'SOFT GIRL', keys:['针织','浅色','圆弧线条'],
      shoes:['玛丽珍鞋','芭蕾鞋','白色小球鞋'], outer:['针织开衫','灯芯绒外套','短款夹克'],
      bottom:['百褶半裙','直筒牛仔裤','奶白色阔腿裤'], top:['泡泡袖上衣','马海毛针织'],
      acc:['珍珠项链','发夹','藤编包'], dress:['碎花连衣裙','针织长裙'] },
    cool:    { name:'酷帅辣妹', en:'EDGY', keys:['皮革','金属','黑色系'],
      shoes:['厚底靴','切尔西靴','老爹鞋'], outer:['皮夹克','oversize 西装','机车服'],
      bottom:['黑色直筒裤','工装裤','深色微喇裤'], top:['短款上衣','黑色修身打底'],
      acc:['银色耳环','链条包','墨镜'], dress:['黑色吊带裙','皮裙'] },
    elegant: { name:'知性优雅', en:'ELEGANT', keys:['西装料','垂感','中性色'],
      shoes:['尖头低跟','乐福鞋','猫跟鞋'], outer:['垂感西装','风衣','针织披肩'],
      bottom:['西装直筒裤','缎面半裙','烟管裤'], top:['真丝衬衫','高领针织'],
      acc:['丝巾','腕表','结构感手提包'], dress:['收腰衬衫裙','针织长款连衣裙'] },
    vintage: { name:'复古文艺', en:'VINTAGE', keys:['格纹','灯芯绒','棕咖色'],
      shoes:['乐福鞋','玛丽珍','帆布鞋'], outer:['灯芯绒外套','格纹大衣','牛仔外套'],
      bottom:['格纹半裙','灯芯绒直筒裤','棕色阔腿裤'], top:['娃娃领衬衫','条纹针织'],
      acc:['贝雷帽','邮差包','圆框眼镜'], dress:['格纹连衣裙','灯芯绒背带裙'] },
    sporty:  { name:'活力运动', en:'SPORTY', keys:['运动混搭','字母元素','活力色'],
      shoes:['老爹鞋','德训鞋','板鞋'], outer:['棒球服','运动开衫','冲锋衣'],
      bottom:['运动直筒裤','牛仔裤','百慕大短裤'], top:['字母 T 恤','连帽卫衣'],
      acc:['棒球帽','腰包','双色袜子'], dress:['卫衣连衣裙'] },
    jp:      { name:'日系松弛', en:'Japanese Casual', keys:['宽松轮廓','奶咖色系','层次'],
      shoes:['帆布鞋','乐福鞋','勃肯鞋'], outer:['廓形开衫','工装外套','长款马甲'],
      bottom:['阔腿长裙','宽直筒裤','灯芯绒裤'], top:['基础圆领 T','罗纹针织'],
      acc:['帆布托特包','针织围巾','发箍'], dress:['棉麻连衣裙','背心裙叠穿'] },
  };

  const SEASON_OUTER = { summer:[], spring:['风衣','针织开衫','牛仔外套'], winter:['大衣','羽绒服','厚外套'], any:['外套'] };

  /* ── 修图需求关键词（阶段3）───────────────────────── */
  const KW = [
    { key:'slim',   name:'显瘦拉长',  add:{ slim:.028, len:.04 } },
    { key:'skin',   name:'皮肤优化',  add:{ smooth:.45 } },
    { key:'bokeh',  name:'背景虚化',  add:{ bokeh:.5 } },
    { key:'film',   name:'胶片感',    add:{ film:.55, con:.08 } },
    { key:'cool',   name:'冷白皮',    add:{ temp:-.14, exp:.05 } },
    { key:'warm',   name:'奶油暖调',  add:{ temp:.2, film:.3 } },
    { key:'bright', name:'通透明亮',  add:{ exp:.18, sharp:.15 } },
    { key:'mood',   name:'氛围暗调',  add:{ exp:-.08, vig:.3, film:.25 } },
    { key:'grey',   name:'高级灰',    add:{ sat:-.16, con:.1 } },
    { key:'vivid',  name:'鲜活色彩',  add:{ sat:.22 } },
  ];

  /* ── 姿势库（含发力要点）──────────────────────────── */
  const POSE_STAND = [
    { name:'漫走抓拍', en:'MOTION', pick:3,
      steps:['朝镜头方向走，步幅比平时小一半','连拍，选“前脚刚落地、后脚蹬直”的那一帧','视线看斜前方的招牌或树梢，不看镜头'],
      force:'核心收紧、肩胛骨下沉后展；后腿蹬直——腿长立刻多 5 厘米' },
    { name:'倚靠式', en:'LEAN', pick:2,
      steps:['后背或单肩轻靠墙/栏杆，重心放后脚','前腿屈膝、脚尖点地，手插兜或拎包','头微向光源一侧偏，受光更匀'],
      force:'后脑勺向后收（治脖子前倾），靠墙那侧的肩主动放松下沉' },
    { name:'回眸式', en:'TURNING', pick:1,
      steps:['背对镜头走，倒数三二一再转身','只转上半身约 70°，胯保持朝前，头发跟着甩','转身后眼睛先找镜头，嘴角放松'],
      force:'用腰转身不用脖子（脖子转多显僵硬）；下巴前伸 1 厘米再微收' },
    { name:'道具互动', en:'PROPS', pick:2,
      steps:['手上有东西：咖啡杯、书、相机、包带','低头摆弄道具，或举起来挡半张脸','抓“动作进行中”，别摆好了再按快门'],
      force:'手指放松别攥拳；手肘离开躯干一点，身体才有“呼吸感”' },
    { name:'延长线站姿', en:'LINE', pick:5, petite:true,
      steps:['前后脚交叉，前脚朝镜头方向伸、脚尖点地','重心放后脚，胯向反方向轻轻顶','一手举到头顶附近（撩发/碰帽子），拉纵向线条'],
      force:'前腿从胯根开始绷直、脚背压平——从胯到脚尖一条线；配低机位效果翻倍' },
  ];
  const POSE_SIT = [
    { name:'椅面前 1/2', en:'CHAIR', pick:2,
      steps:['只坐椅面前 1/2，别坐实','双腿向斜前方伸，一脚脚背绷直点地','上身立直微前倾，手肘搭膝盖上'],
      force:'腰立起来（想象头顶有线拉着）；大腿收紧才不会被椅面压扁' },
    { name:'台阶交叠', en:'STEPS', pick:2,
      steps:['侧身坐台阶，双腿交叠向画面斜下角伸','一只手撑在身后，肩线放松','脸转向镜头，或看向脚尖'],
      force:'脚背绷直到发酸的程度——脚背一松，整条腿的线条就断了' },
  ];
  const POSE_CLOSE = [
    { name:'45° 侧脸望远', en:'GAZE', pick:3,
      steps:['身体和脸都侧转 45°，看向窗外或远方','先深呼吸再呼出去，嘴角自然放松','连拍 5 张挑眼神最稳的'],
      force:'下巴向前 1 厘米再往下收一点（消双下巴），舌头顶上颚' },
    { name:'撩发瞬间', en:'HAIR', pick:2,
      steps:['手指从耳后把头发撩向另一侧','在头发落下的瞬间连拍','落下后睁眼看镜头那张最自然'],
      force:'只动手指不动手腕，更别带动整条手臂' },
    { name:'低头细节', en:'DETAIL', pick:2,
      steps:['低头整理袖口、包带或项链','取景到睫毛和鼻梁的弧线即可','让光从侧上方来，睫毛有投影'],
      force:'脖子拉长、肩膀压住——低头最容易缩脖驼背' },
  ];

  const FRAMINGS = [
    { id:'full', name:'全身', en:'FULL BODY',
      cam:'机位与腰胯齐平（千万别用胸口高度拍全身）· 距离 3 米开外 · 竖构图',
      tips:['脚贴画面底边、只留一指空，头顶留一拳——下少上多，人显高','鞋必须完整入镜，否则整套搭配等于白搭','找一条“势”：走廊、斑马线、栏杆的线条从下往上带画面'],
      fig:'full' },
    { id:'half', name:'半身', en:'HALF BODY',
      cam:'机位与胸口齐平 · 距离 1.2～1.5 米 · 用 2× 变焦或人像模式',
      tips:['变焦拍半身比凑近拍更不变形——畸变小，脸自然','眼睛放在画面上 1/3 的位置','手要有事做：拿咖啡、扶包带、碰衣领'],
      fig:'half' },
    { id:'close', name:'特写', en:'CLOSE-UP',
      cam:'机位与眼睛齐平 · 距离 0.8～1 米 · 优先侧 45° 角度',
      tips:['找侧逆光——眼睛里会出现“眼神光”，一张特写的灵魂','对焦对靠近镜头的那只眼睛','头发别全别耳后，留几缕碎发框住脸'],
      fig:'close' },
  ];

  const UNIVERSAL_PITS = [
    '正午头顶光必出“熊猫眼”——挪到屋檐或树影的边缘，让光从侧面来',
    '连拍永远比单拍靠谱：好照片是“挑”出来的，不是“摆”出来的',
  ];

  /* ── 工具 ─────────────────────────────────────────── */
  const pick = (arr, seed) => arr[(seed ?? Math.floor(Math.random()*arr.length)) % arr.length];

  function pieceName(colorKey, fitKey, catName){
    const c = COLORS[colorKey]?.name || '';
    const f = fitKey && fitKey !== 'std' ? (FITS.find(x=>x.key===fitKey)?.name || '') : '';
    return (c + f + catName).replace(/^标准/, '');
  }

  /* 色彩策略诊断 */
  function colorStrategy(items){
    const keys = items.map(it => it.color).filter(k => COLORS[k]);
    if (!keys.length) return { type:'mono', accent:null, note:'无衣物信息，按安全无彩色处理' };
    const chroma = keys.filter(k => !NEUTRAL_KEYS.includes(k) && COLORS[k].fam !== 'pattern');
    const hasPattern = keys.some(k => COLORS[k].fam === 'pattern');
    const hues = [...new Set(chroma)];
    if (hues.length === 0 && !hasPattern)
      return { type:'mono', accent:null, note:'全身无彩色，靠色阶和材质做层次' };
    if (hues.length === 1 && !hasPattern)
      return { type:'accent', accent:hues[0], note:'一色点睛，无彩色护航' };
    return { type:'calm', accent:hues[0]||null, note:'多色并存，需要无彩色压场' };
  }

  /* 材质策略诊断：软 × 硬对撞是免费的高级感 */
  function materialStrategy(items){
    const texs = items.filter(it => it.mat)
      .map(it => (MATERIALS.find(m => m.key === it.mat) || {}).tex).filter(Boolean);
    if (!texs.length) return null;
    const soft = texs.filter(t => t === 'soft').length;
    const hard = texs.filter(t => t === 'hard').length;
    if (soft && hard) return { lines:[
      '你的单品里有软（针织/棉/纱）也有硬（牛仔/皮/西装料）——上下分开穿就是“材质对撞”，颜色不用费心也高级',
      '硬材质放外部（外套/鞋）撑轮廓，软材质贴身穿管舒服，这是最省事的排法' ] };
    if (soft >= 2) return { lines:[
      '你这几件都是软材质——全身软会显塌，搭一件硬的来“撑住”：牛仔外套、西装料裤或结构感包都行',
      '没有硬单品时，选有肩线、面料厚实的穿法，代替硬材质的“骨架”' ] };
    if (hard >= 2) return { lines:[
      '这几件都偏硬朗——混一件软的进来中和（针织内搭、丝巾、毛线帽），硬朗才不会变刻板' ] };
    return { lines:[ '材质单一时用配饰补层次：针织围巾、帆布托特、皮质腰带，都能加一层质感' ] };
  }

  /* ── 单品槽位匹配 ─────────────────────────────────── */
  function slotsOf(items){
    const s = { top:[], outer:[], dress:[], bottom:[], shoes:[], acc:[] };
    items.forEach(it => { const cat = CATEGORIES.find(c=>c.key===it.cat); if (cat && s[cat.slot]) s[cat.slot].push(it); });
    return s;
  }

  /* 补充单品建议（按风格池 + 身形修正） */
  function supplement(kind, style, seed, ctx, strategy){
    const season = ctx.season || 'any';
    const bodies = ctx.bodies || [];
    if (kind === 'shoes'){
      let pool = style.shoes.slice();
      if (bodies.includes('petite') || bodies.includes('shortLegs')) pool = ['厚底乐福鞋', ...pool];
      return pick(pool, seed);
    }
    if (kind === 'outer'){
      let pool = style.outer.slice();
      if (season === 'winter') pool = ['呢子大衣', '长款羽绒服'];
      if (season === 'summer') return null;
      if (bodies.includes('petite')) pool = pool.filter(x => !x.includes('长款'));
      return pick(pool, seed);
    }
    if (kind === 'bottom'){
      let pool = style.bottom.slice();
      if (bodies.includes('pear')) pool = ['A 字半裙', '深色直筒裤', '深色阔腿裤'];
      if (bodies.includes('apple')) pool = ['直筒西装裤', '垂感阔腿裤'];
      if (bodies.includes('petite') || bodies.includes('shortLegs')) pool = pool.map(x => x.includes('裤') ? '高腰' + x : x);
      return pick(pool, seed);
    }
    if (kind === 'top'){
      let pool = style.top.slice();
      if (bodies.includes('shoulder')) pool = ['V 领针织', 'U 领衬衫'];
      if (bodies.includes('apple')) pool = ['V 领上衣', '垂感衬衫'];
      return pick(pool, seed);
    }
    if (kind === 'dress'){
      let pool = style.dress.slice();
      if (bodies.includes('apple')) pool = ['直筒衬衫裙'];
      if (bodies.includes('hourglass')) pool = ['收腰连衣裙', ...pool];
      if (bodies.includes('petite')) pool = pool.map(x => '高腰' + x);
      return pick(pool, seed);
    }
    if (kind === 'acc'){
      let pool = style.acc.slice();
      if (strategy.type === 'accent' && strategy.accent && Math.random() < .5){
        const cn = COLORS[strategy.accent].name;
        pool = [`${cn}色小物（袜子/发饰/包）`, ...pool];
      }
      return pick(pool, seed);
    }
    return null;
  }

  /* ── 方案生成主函数 ───────────────────────────────── */
  function generatePlans(items, ctx, seedBase = 0){
    const slots = slotsOf(items);
    const strategy = colorStrategy(items);
    const texStrategy = materialStrategy(items);
    const scene = SCENES[ctx.scene] || SCENES.generic;
    const style = STYLES[ctx.pref] || STYLES.minimal;
    const bodies = ctx.bodies || [];
    const season = ctx.season || 'any';
    const skin = SKINS[ctx.skin] || SKINS.unknown;
    const plans = [];

    const hasDress = slots.dress.length > 0;
    const hasBottom = slots.bottom.length > 0 || hasDress;
    const hasTop = slots.top.length > 0;

    const planDefs = [
      { no:'LOOK 01', title:'稳妥牌 · 不出错组合', en:'SAFE EDIT', mode:'safe' },
      { no:'LOOK 02', title:`${style.name} · 风格拉满`, en:style.en.toUpperCase(), mode:'style' },
      { no:'LOOK 03', title:'反差混搭 · 有记忆点', en:'CONTRAST MIX', mode:'mix' },
    ];

    planDefs.forEach((def, i) => {
      const seed = seedBase + i * 7;
      const pieces = [];
      const mine = slotItems => slotItems.slice(0, 2).forEach(it =>
        pieces.push({ name: pieceName(it.color, it.fit, CATEGORIES.find(c=>c.key===it.cat).name), mine:true, note: it.fit==='loose' ? '你的 · 宽松版型记得“松而不垮”，有肩线最好' : '你的' }));

      // 上装 / 连衣裙
      if (hasDress && (def.mode !== 'mix' || !hasTop)) mine(slots.dress);
      else if (hasTop) mine(slots.top);
      else {
        const t = supplement('top', def.mode==='cool'?STYLES.cool:style, seed, ctx, strategy);
        pieces.push({ name:t, mine:false, note:'建议补 · 打底基础件，选最合身的' });
      }
      // 外套
      const outerSuggest = def.mode === 'mix' ? (season==='summer' ? null : pick(['皮夹克','oversize 西装'], seed)) : supplement('outer', style, seed+1, ctx, strategy);
      if (slots.outer.length) mine(slots.outer);
      else if (outerSuggest) pieces.push({ name:outerSuggest, mine:false, note:'建议补 · 和内搭拉开材质差' });
      // 下装
      if (!hasDress){
        if (slots.bottom.length) mine(slots.bottom);
        else {
          const b = supplement('bottom', style, seed+2, ctx, strategy);
          pieces.push({ name:b, mine:false, note:'建议补 · 版型比颜色重要' });
        }
      }
      // 鞋
      if (slots.shoes.length) mine(slots.shoes);
      else pieces.push({ name:supplement('shoes', def.mode==='style'?style:(def.mode==='mix'?STYLES.cool:STYLES.minimal), seed+3, ctx, strategy), mine:false, note:'建议补 · 鞋决定整套的“完成度”' });
      // 配饰
      if (slots.acc.length) mine(slots.acc);
      pieces.push({ name:supplement('acc', style, seed+4, ctx, strategy), mine:false, note:'建议补 · 一件就够，别贪多' });

      // 反差方案：如果上下装都齐，加一条风格转换建议
      if (def.mode === 'mix' && hasTop && hasBottom)
        pieces.push({ name:'材质对撞思路', mine:false, note:'硬（牛仔/皮/西装料）× 软（针织/纱）放在一起，比买新衣服更出效果' });

      /* 搭配逻辑 */
      const color = [];
      if (strategy.type === 'mono')
        color.push('全身无彩色时，高级感的钥匙是“色阶差”：上下装至少拉开两档深浅（如奶白 × 深灰）','用材质代替颜色制造层次：针织、牛仔、皮革放在一起，同色也不闷');
      else if (strategy.type === 'accent' && strategy.accent){
        const cn = COLORS[strategy.accent].name;
        color.push(`让${cn}只出现“一次主的 + 一次呼应”：比如上装用它，鞋或袜子再小小出现一下`,'其余位置全部交给无彩色，亮点才立得住');
      } else if (strategy.type === 'calm'){
        color.push('颜色多时先定主次：面积最大的当主色，其余收进鞋包小件','拿无彩色（白/灰/牛仔蓝）在两个亮色中间“隔开”，它们就不打架');
      } else color.push('先按“全身三色以内”检查一遍：主色 + 辅色 + 点缀色');

      const ratio = [];
      if (hasDress){ ratio.push('连衣裙的腰线位置决定比例——腰带或收腰款优先，裙长到小腿肚最稳'); }
      else ratio.push('上短下长造 3:7 比例：上衣塞进腰头，或直接选短款外套','腰带系在肋骨下方而非胯上，比例立刻不一样');
      if (bodies.includes('petite') || bodies.includes('shortLegs')) ratio.push('鞋裤同色顺延（如黑裤+黑鞋），腿长从鞋头开始算');

      const body = bodies.slice(0, 3).map(b => {
        const r = BODIES[b]; if (!r) return null;
        return `【${r.name}】要做：${r.do[0]}。避开：${r.dont[0]}。`;
      }).filter(Boolean);
      if (!body.length) body.push('没填身形？方案先按通用版给；在第一步补上身形，“避开什么”会更具体。');

      const sceneLogic = [scene.logic[0], scene.logic[1]].filter(Boolean);
      const skinLine = skin.tip[0] ? `肤色提示：${skin.tip[0]}` : null;
      if (skinLine) color.push(skinLine);

      const texture = texStrategy ? texStrategy.lines.slice() : [];
      if (def.mode === 'mix') texture.push('这套的记忆点交给材质对撞：外层硬（挺括/皮革感），内层软（针织/纱），一眼看出“会穿”');

      const keywords = def.mode === 'safe' ? ['不出错','耐看','百搭']
        : def.mode === 'style' ? style.keys
        : ['材质对撞','记忆点','进阶'];
      const tagline = def.mode === 'safe' ? '用最少的决定换最稳的好看——赶时间、拿不准，穿这套。'
        : def.mode === 'style' ? `按你想要的“${style.name}”方向把风格元素配齐，出门自带主题。`
        : '打破一点“常规搭配法”，熟悉的单品换个搭法，回头客就是它。';

      plans.push({ ...def, tagline, keywords, pieces,
        logic:{ color, ratio, texture, body, scene:sceneLogic } });
    });
    return plans;
  }

  /* ── 拍摄指导生成 ─────────────────────────────────── */
  function generateGuide(plan, ctx, seedBase = 0){
    const scene = SCENES[ctx.scene] || SCENES.generic;
    const bodies = ctx.bodies || [];
    const petite = bodies.includes('petite') || bodies.includes('shortLegs');

    const framings = FRAMINGS.map(f => {
      const tips = f.tips.slice();
      if (f.id === 'full' && petite) tips.push('小个子专属：机位再放低 10 厘米微微仰拍，腿被“拉长”是从机位开始的');
      return { ...f, tips };
    });

    const sel = (pool, seed) => {
      let p = pool.slice();
      if (petite){ const pp = pool.filter(x => x.petite); if (pp.length) p = pp; }
      return pick(p, seed);
    };
    const poses = {
      stand: sel(POSE_STAND, seedBase),
      sit:   pick(POSE_SIT, seedBase + 3),
      close: pick(POSE_CLOSE, seedBase + 5),
    };

    const pits = [UNIVERSAL_PITS[0], scene.pits[0], UNIVERSAL_PITS[1]];

    return { framings, poses, light: scene.light, bg: scene.bg, pits, scene };
  }

  /* 机位示意图 SVG */
  function framingSVG(figId){
    const thirds = `<line x1="40" y1="0" x2="40" y2="160" stroke="rgba(255,255,255,.13)" stroke-width="1"/>
      <line x1="80" y1="0" x2="80" y2="160" stroke="rgba(255,255,255,.13)" stroke-width="1"/>
      <line x1="0" y1="53" x2="120" y2="53" stroke="rgba(255,255,255,.13)" stroke-width="1"/>
      <line x1="0" y1="107" x2="120" y2="107" stroke="rgba(255,255,255,.13)" stroke-width="1"/>`;
    const cam = (x,y,txt) => `<g transform="translate(${x},${y})">
        <rect x="0" y="0" width="14" height="10" rx="2" fill="#2997ff"/>
        <circle cx="7" cy="5" r="2.6" fill="#000000"/>
        <text x="18" y="8.5" font-family="Consolas,monospace" font-size="7" fill="#2997ff" letter-spacing="1">${txt}</text></g>`;
    let body = '';
    if (figId === 'full') body = `
      <circle cx="62" cy="38" r="8" fill="none" stroke="#2997ff" stroke-width="2"/>
      <line x1="62" y1="46" x2="62" y2="95" stroke="#2997ff" stroke-width="2"/>
      <line x1="62" y1="58" x2="48" y2="80" stroke="#2997ff" stroke-width="2"/>
      <line x1="62" y1="58" x2="76" y2="80" stroke="#2997ff" stroke-width="2"/>
      <line x1="62" y1="95" x2="52" y2="140" stroke="#2997ff" stroke-width="2"/>
      <line x1="62" y1="95" x2="74" y2="138" stroke="#2997ff" stroke-width="2"/>
      <line x1="52" y1="140" x2="52" y2="148" stroke="#2997ff" stroke-width="2"/>
      <line x1="74" y1="138" x2="74" y2="148" stroke="#2997ff" stroke-width="2"/>
      ${cam(10,120,'腰胯高度')}`;
    else if (figId === 'half') body = `
      <circle cx="58" cy="42" r="13" fill="none" stroke="#2997ff" stroke-width="2"/>
      <line x1="58" y1="55" x2="58" y2="112" stroke="#2997ff" stroke-width="2"/>
      <line x1="58" y1="70" x2="36" y2="100" stroke="#2997ff" stroke-width="2"/>
      <line x1="58" y1="70" x2="80" y2="100" stroke="#2997ff" stroke-width="2"/>
      <line x1="30" y1="120" x2="90" y2="120" stroke="rgba(238,227,210,.3)" stroke-width="1" stroke-dasharray="4 3"/>
      ${cam(10,30,'胸口高度')}`;
    else body = `
      <circle cx="60" cy="72" r="30" fill="none" stroke="#2997ff" stroke-width="2"/>
      <circle cx="52" cy="66" r="2.6" fill="#2997ff"/>
      <path d="M48 88 Q60 92 72 88" fill="none" stroke="#2997ff" stroke-width="1.6"/>
      ${cam(8,130,'眼睛高度')}`;
    return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="机位示意">${thirds}${body}</svg>`;
  }

  /* 手动文本解析（弱解析：仅品类猜词） */
  function parseManual(text){
    const t = text.trim();
    const guess = { cat:'tee', color:null, fit:null, mat:null };
    if (/衬衫/.test(t)) guess.cat = 'shirt';
    else if (/针织|毛衣|毛衫/.test(t)) guess.cat = 'knit';
    else if (/卫衣/.test(t)) guess.cat = 'hoodie';
    else if (/背心|吊带/.test(t)) guess.cat = 'vest';
    else if (/西装/.test(t)) guess.cat = 'blazer';
    else if (/风衣|大衣/.test(t)) guess.cat = 'coat';
    else if (/羽绒服|棉服/.test(t)) guess.cat = 'puffer';
    else if (/牛仔外套|夹克/.test(t)) guess.cat = 'jacket';
    else if (/连衣裙/.test(t)) guess.cat = 'dress';
    else if (/半裙|半身裙|短裙|长裙|A字裙/.test(t)) guess.cat = 'skirt';
    else if (/裤/.test(t)) guess.cat = 'pants';
    else if (/鞋/.test(t)) guess.cat = 'shoes';
    else if (/包|帽|丝巾|项链|腰带/.test(t)) guess.cat = 'acc';
    if (/黑/.test(t)) guess.color = 'black';
    else if (/白|米/.test(t)) guess.color = /奶|米/.test(t) ? 'cream' : 'white';
    else if (/灰/.test(t)) guess.color = 'grey';
    else if (/驼|卡其/.test(t)) guess.color = 'camel';
    else if (/棕|咖/.test(t)) guess.color = 'brown';
    else if (/牛仔/.test(t)) guess.color = 'denim';
    else if (/藏青|深蓝/.test(t)) guess.color = 'navy';
    else if (/蓝/.test(t)) guess.color = 'blue';
    else if (/紫/.test(t)) guess.color = 'purple';
    else if (/绿/.test(t)) guess.color = 'green';
    else if (/红/.test(t)) guess.color = 'red';
    else if (/粉/.test(t)) guess.color = 'pink';
    else if (/黄|橙/.test(t)) guess.color = 'yellow';
    else if (/格纹|条纹|印花|碎花/.test(t)) guess.color = 'multi';
    if (/宽松|oversize|廓形/i.test(t)) guess.fit = 'loose';
    else if (/修身|紧身|合身/.test(t)) guess.fit = 'slim';
    else if (/短款/.test(t)) guess.fit = 'short';
    else if (/长款|过膝/.test(t)) guess.fit = 'long';
    if (/针织|毛衣|毛衫/.test(t)) guess.mat = 'knit';
    else if (/牛仔/.test(t)) guess.mat = 'denim';
    else if (/皮革|小皮衣|皮衣|皮裙|皮裤/.test(t)) guess.mat = 'leather';
    else if (/西装/.test(t)) guess.mat = 'suit';
    else if (/真丝|缎面/.test(t)) guess.mat = 'silk';
    else if (/雪纺|纱/.test(t)) guess.mat = 'chiffon';
    else if (/棉麻|亚麻/.test(t)) guess.mat = 'linen';
    else if (/灯芯绒/.test(t)) guess.mat = 'corduroy';
    else if (/羊毛|毛呢|呢子/.test(t)) guess.mat = 'wool';
    else if (/棉/.test(t)) guess.mat = 'cotton';
    return guess;
  }

  /* 示例数据 */
  const SAMPLE = {
    items:[
      { cat:'knit',  color:'cream', fit:'loose', mat:'knit' },
      { cat:'pants', color:'navy',  fit:'std',   mat:'suit' },
    ],
    ctx:{ scene:'date', season:'spring', bodies:['petite'], skin:'warm', pref:'jp', notes:'' },
  };

  /* 选项元数据（给 UI 渲染用） */
  const OPTIONS = {
    scenes: Object.keys(SCENES).filter(k=>k!=='generic').map(k=>({ key:k, name:SCENES[k].name, en:SCENES[k].en })),
    seasons: SEASONS,
    bodies: Object.keys(BODIES).map(k=>({ key:k, name:BODIES[k].name })),
    skins: Object.keys(SKINS).map(k=>({ key:k, name:SKINS[k].name })),
    styles: Object.keys(STYLES).map(k=>({ key:k, name:STYLES[k].name, en:STYLES[k].en })),
  };

  return { COLORS, CATEGORIES, FITS, MATERIALS, KW, OPTIONS, BODIES, SCENES, STYLES, SKINS,
           generatePlans, generateGuide, framingSVG, parseManual, SAMPLE, colorStrategy, materialStrategy };
})();
