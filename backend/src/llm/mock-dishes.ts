import { DishType } from './llm.types';

export interface MockDish {
  name: string;
  tags: string[];
  ingredients: string[];
  cookMinutes: number;
  difficulty: string;
}

export const MOCK_DISHES: MockDish[] = [
  { name: '番茄牛腩', tags: ['家常', '下饭'], ingredients: ['牛腩', '番茄'], cookMinutes: 60, difficulty: '中等' },
  { name: '蒜蓉西兰花', tags: ['清淡', '蔬菜'], ingredients: ['西兰花', '大蒜'], cookMinutes: 15, difficulty: '简单' },
  { name: '宫保鸡丁', tags: ['微辣', '下饭'], ingredients: ['鸡胸肉', '花生'], cookMinutes: 30, difficulty: '中等' },
  { name: '清蒸鲈鱼', tags: ['清淡', '海鲜'], ingredients: ['鲈鱼', '姜'], cookMinutes: 25, difficulty: '中等' },
  { name: '土豆烧排骨', tags: ['家常', '硬菜'], ingredients: ['排骨', '土豆'], cookMinutes: 50, difficulty: '中等' },
  { name: '茄子豆角', tags: ['素菜', '家常'], ingredients: ['茄子', '豆角'], cookMinutes: 25, difficulty: '简单' },
  { name: '酸辣土豆丝', tags: ['快手', '开胃'], ingredients: ['土豆', '醋'], cookMinutes: 15, difficulty: '简单' },
  { name: '香菇青菜', tags: ['清淡', '蔬菜'], ingredients: ['香菇', '青菜'], cookMinutes: 15, difficulty: '简单' },
  { name: '红烧茄子', tags: ['下饭', '素菜'], ingredients: ['茄子', '蒜'], cookMinutes: 20, difficulty: '简单' },
  { name: '可乐鸡翅', tags: ['甜咸', '孩子爱吃'], ingredients: ['鸡翅', '可乐'], cookMinutes: 35, difficulty: '简单' },
  { name: '鱼香肉丝', tags: ['微辣', '下饭'], ingredients: ['猪里脊', '木耳'], cookMinutes: 25, difficulty: '中等' },
  { name: '虾仁滑蛋', tags: ['快手', '蛋白'], ingredients: ['虾仁', '鸡蛋'], cookMinutes: 15, difficulty: '简单' },
  { name: '青椒肉丝', tags: ['家常', '快手'], ingredients: ['青椒', '猪肉丝'], cookMinutes: 20, difficulty: '简单' },
  { name: '西红柿鸡蛋面', tags: ['面食', '快手'], ingredients: ['面条', '番茄'], cookMinutes: 20, difficulty: '简单' },
  { name: '麻婆豆腐', tags: ['微辣', '下饭'], ingredients: ['豆腐', '牛肉末'], cookMinutes: 20, difficulty: '简单' },
  { name: '洋葱炒鸡蛋', tags: ['家常', '快手'], ingredients: ['洋葱', '鸡蛋'], cookMinutes: 15, difficulty: '简单' },
  { name: '芹菜炒香干', tags: ['素菜', '清淡'], ingredients: ['芹菜', '香干'], cookMinutes: 15, difficulty: '简单' },
  { name: '糖醋里脊', tags: ['酸甜', '硬菜'], ingredients: ['里脊', '番茄酱'], cookMinutes: 35, difficulty: '中等' },
  { name: '蚝油生菜', tags: ['蔬菜', '快手'], ingredients: ['生菜', '蚝油'], cookMinutes: 10, difficulty: '简单' },
  { name: '白灼虾', tags: ['清淡', '海鲜'], ingredients: ['鲜虾', '姜葱'], cookMinutes: 12, difficulty: '简单' },
  { name: '豉汁蒸排骨', tags: ['粤菜', '下饭'], ingredients: ['排骨', '豆豉'], cookMinutes: 25, difficulty: '中等' },
  { name: '姜葱炒蟹', tags: ['海鲜', '硬菜'], ingredients: ['螃蟹', '姜葱'], cookMinutes: 20, difficulty: '中等' },
  { name: '蒜蓉粉丝蒸扇贝', tags: ['海鲜', '清淡'], ingredients: ['扇贝', '粉丝'], cookMinutes: 18, difficulty: '简单' },
  { name: '红烧带鱼', tags: ['家常', '海鲜'], ingredients: ['带鱼', '酱油'], cookMinutes: 30, difficulty: '中等' },
  { name: '干煸四季豆', tags: ['川菜', '下饭'], ingredients: ['四季豆', '肉末'], cookMinutes: 20, difficulty: '简单' },
  { name: '地三鲜', tags: ['东北', '素菜'], ingredients: ['土豆', '茄子', '青椒'], cookMinutes: 25, difficulty: '简单' },
  { name: '京酱肉丝', tags: ['北方', '下饭'], ingredients: ['里脊', '甜面酱'], cookMinutes: 25, difficulty: '中等' },
  { name: '木须肉', tags: ['家常', '快手'], ingredients: ['猪肉', '鸡蛋', '木耳'], cookMinutes: 20, difficulty: '简单' },
  { name: '回锅肉', tags: ['川菜', '下饭'], ingredients: ['五花肉', '青椒'], cookMinutes: 35, difficulty: '中等' },
  { name: '水煮牛肉', tags: ['川菜', '辣'], ingredients: ['牛肉', '豆芽'], cookMinutes: 30, difficulty: '中等' },
  { name: '酸菜鱼', tags: ['川菜', '开胃'], ingredients: ['鱼片', '酸菜'], cookMinutes: 25, difficulty: '中等' },
  { name: '黄焖鸡', tags: ['家常', '下饭'], ingredients: ['鸡腿', '香菇'], cookMinutes: 40, difficulty: '简单' },
  { name: '三杯鸡', tags: ['台式', '酱香'], ingredients: ['鸡腿', '九层塔'], cookMinutes: 35, difficulty: '中等' },
  { name: '盐焗鸡', tags: ['粤菜', '硬菜'], ingredients: ['鸡', '盐'], cookMinutes: 50, difficulty: '中等' },
  { name: '白切鸡', tags: ['粤菜', '清淡'], ingredients: ['鸡', '姜葱'], cookMinutes: 45, difficulty: '中等' },
  { name: '豉油鸡', tags: ['粤菜', '酱香'], ingredients: ['鸡', '生抽'], cookMinutes: 40, difficulty: '简单' },
  { name: '啤酒鸭', tags: ['家常', '硬菜'], ingredients: ['鸭', '啤酒'], cookMinutes: 55, difficulty: '中等' },
  { name: '红烧猪蹄', tags: ['胶原蛋白', '硬菜'], ingredients: ['猪蹄', '冰糖'], cookMinutes: 90, difficulty: '中等' },
  { name: '萝卜炖羊肉', tags: ['暖身', '秋冬'], ingredients: ['羊肉', '白萝卜'], cookMinutes: 70, difficulty: '中等' },
  { name: '孜然羊肉', tags: ['西北', '下饭'], ingredients: ['羊肉', '孜然'], cookMinutes: 25, difficulty: '中等' },
  { name: '葱爆羊肉', tags: ['快手', '下饭'], ingredients: ['羊肉', '大葱'], cookMinutes: 15, difficulty: '简单' },
  { name: '蒜蓉空心菜', tags: ['蔬菜', '快手'], ingredients: ['空心菜', '蒜'], cookMinutes: 8, difficulty: '简单' },
  { name: '清炒荷兰豆', tags: ['清淡', '蔬菜'], ingredients: ['荷兰豆', '蒜'], cookMinutes: 10, difficulty: '简单' },
  { name: '虎皮青椒', tags: ['下饭', '素菜'], ingredients: ['青椒', '蒜'], cookMinutes: 15, difficulty: '简单' },
  { name: '干锅花菜', tags: ['香辣', '下饭'], ingredients: ['花菜', '五花肉'], cookMinutes: 20, difficulty: '简单' },
  { name: '蚂蚁上树', tags: ['川菜', '下饭'], ingredients: ['粉丝', '肉末'], cookMinutes: 18, difficulty: '简单' },
  { name: '红烧豆腐', tags: ['家常', '素菜'], ingredients: ['豆腐', '肉末'], cookMinutes: 20, difficulty: '简单' },
  { name: '皮蛋豆腐', tags: ['凉菜', '快手'], ingredients: ['豆腐', '皮蛋'], cookMinutes: 10, difficulty: '简单' },
  { name: '西红柿炒蛋', tags: ['家常', '孩子爱吃'], ingredients: ['番茄', '鸡蛋'], cookMinutes: 12, difficulty: '简单' },
  { name: '韭菜炒鸡蛋', tags: ['快手', '家常'], ingredients: ['韭菜', '鸡蛋'], cookMinutes: 10, difficulty: '简单' },
  { name: '西葫芦炒蛋', tags: ['清淡', '快手'], ingredients: ['西葫芦', '鸡蛋'], cookMinutes: 12, difficulty: '简单' },
  { name: '蒜香排骨', tags: ['硬菜', '下饭'], ingredients: ['排骨', '蒜'], cookMinutes: 45, difficulty: '中等' },
  { name: '糖醋排骨', tags: ['酸甜', '孩子爱吃'], ingredients: ['排骨', '醋'], cookMinutes: 50, difficulty: '中等' },
  { name: '粉蒸肉', tags: ['蒸菜', '下饭'], ingredients: ['五花肉', '米粉'], cookMinutes: 60, difficulty: '中等' },
  { name: '梅菜扣肉', tags: ['客家', '硬菜'], ingredients: ['五花肉', '梅菜'], cookMinutes: 80, difficulty: '困难' },
  { name: '手撕包菜', tags: ['快手', '下饭'], ingredients: ['包菜', '干辣椒'], cookMinutes: 12, difficulty: '简单' },
  { name: '蒜蓉秋葵', tags: ['清淡', '健康'], ingredients: ['秋葵', '蒜'], cookMinutes: 10, difficulty: '简单' },
  { name: '清炒芦笋', tags: ['清淡', '蔬菜'], ingredients: ['芦笋', '蒜'], cookMinutes: 10, difficulty: '简单' },
  { name: '香菇滑鸡', tags: ['粤菜', '家常'], ingredients: ['鸡腿', '香菇'], cookMinutes: 30, difficulty: '简单' },
  { name: '板栗烧鸡', tags: ['秋冬', '硬菜'], ingredients: ['鸡', '板栗'], cookMinutes: 45, difficulty: '中等' },
  { name: '咖喱鸡块', tags: ['异域', '下饭'], ingredients: ['鸡腿', '咖喱'], cookMinutes: 35, difficulty: '简单' },
  { name: '椒盐虾', tags: ['海鲜', '香脆'], ingredients: ['虾', '椒盐'], cookMinutes: 15, difficulty: '简单' },
  { name: '清蒸鳕鱼', tags: ['清淡', '海鲜'], ingredients: ['鳕鱼', '姜'], cookMinutes: 12, difficulty: '简单' },
  { name: '香煎三文鱼', tags: ['西式', '蛋白'], ingredients: ['三文鱼', '柠檬'], cookMinutes: 15, difficulty: '简单' },
  { name: '腊肉炒蒜苗', tags: ['湘菜', '下饭'], ingredients: ['腊肉', '蒜苗'], cookMinutes: 15, difficulty: '简单' },
  { name: '腊肠炒饭', tags: ['快手', '主食'], ingredients: ['米饭', '腊肠'], cookMinutes: 15, difficulty: '简单' },
  { name: '扬州炒饭', tags: ['主食', '家常'], ingredients: ['米饭', '虾仁', '火腿'], cookMinutes: 18, difficulty: '简单' },
  { name: '葱油拌面', tags: ['面食', '快手'], ingredients: ['面条', '小葱'], cookMinutes: 15, difficulty: '简单' },
  { name: '担担面', tags: ['面食', '微辣'], ingredients: ['面条', '肉末'], cookMinutes: 20, difficulty: '简单' },
];

export const MOCK_SOUPS: MockDish[] = [
  { name: '冬瓜排骨汤', tags: ['汤品', '清淡'], ingredients: ['排骨', '冬瓜'], cookMinutes: 60, difficulty: '简单' },
  { name: '番茄蛋花汤', tags: ['汤品', '快手'], ingredients: ['番茄', '鸡蛋'], cookMinutes: 15, difficulty: '简单' },
  { name: '紫菜虾皮汤', tags: ['汤品', '清淡'], ingredients: ['紫菜', '虾皮'], cookMinutes: 10, difficulty: '简单' },
  { name: '玉米排骨汤', tags: ['汤品', '家常'], ingredients: ['排骨', '玉米'], cookMinutes: 55, difficulty: '简单' },
  { name: '山药鸡汤', tags: ['汤品', '滋补'], ingredients: ['鸡肉', '山药'], cookMinutes: 70, difficulty: '中等' },
  { name: '萝卜牛腩汤', tags: ['汤品', '暖胃'], ingredients: ['牛腩', '白萝卜'], cookMinutes: 80, difficulty: '中等' },
  { name: '莲藕排骨汤', tags: ['汤品', '润燥'], ingredients: ['排骨', '莲藕'], cookMinutes: 65, difficulty: '简单' },
  { name: '鲫鱼豆腐汤', tags: ['汤品', '鲜美'], ingredients: ['鲫鱼', '豆腐'], cookMinutes: 35, difficulty: '中等' },
  { name: '银耳莲子汤', tags: ['汤品', '甜品'], ingredients: ['银耳', '莲子'], cookMinutes: 90, difficulty: '简单' },
  { name: '海带排骨汤', tags: ['汤品', '家常'], ingredients: ['排骨', '海带'], cookMinutes: 60, difficulty: '简单' },
  { name: '花旗参乌鸡汤', tags: ['汤品', '滋补'], ingredients: ['乌鸡', '花旗参'], cookMinutes: 120, difficulty: '中等' },
  { name: '冬瓜薏米汤', tags: ['汤品', '祛湿'], ingredients: ['冬瓜', '薏米'], cookMinutes: 50, difficulty: '简单' },
  { name: '番茄牛腩汤', tags: ['汤品', '开胃'], ingredients: ['牛腩', '番茄'], cookMinutes: 75, difficulty: '中等' },
  { name: '菠菜猪肝汤', tags: ['汤品', '补铁'], ingredients: ['菠菜', '猪肝'], cookMinutes: 20, difficulty: '简单' },
  { name: '菌菇鸡汤', tags: ['汤品', '鲜美'], ingredients: ['鸡', '菌菇'], cookMinutes: 55, difficulty: '简单' },
  { name: '黄豆猪蹄汤', tags: ['汤品', '胶原'], ingredients: ['猪蹄', '黄豆'], cookMinutes: 90, difficulty: '中等' },
  { name: '丝瓜蛋汤', tags: ['汤品', '快手'], ingredients: ['丝瓜', '鸡蛋'], cookMinutes: 12, difficulty: '简单' },
  { name: '白菜豆腐汤', tags: ['汤品', '清淡'], ingredients: ['白菜', '豆腐'], cookMinutes: 15, difficulty: '简单' },
  { name: '虫草花炖鸡汤', tags: ['汤品', '滋补'], ingredients: ['鸡', '虫草花'], cookMinutes: 80, difficulty: '中等' },
  { name: '西洋菜排骨汤', tags: ['汤品', '清热'], ingredients: ['排骨', '西洋菜'], cookMinutes: 60, difficulty: '简单' },
];

const EXTRA_DISH_NAMES = [
  '蒜蓉蒸茄子', '香煎带鱼', '椒盐排骨', '清炒豆苗', '红烧牛腩',
  '干锅土豆片', '香辣蟹', '葱油鸡', '口水鸡', '蒜泥白肉',
  '鱼香茄子', '干锅牛蛙', '香辣虾', '蒜蓉开边虾', '清蒸多宝鱼',
  '红烧狮子头', '清炖鸡汤', '小炒黄牛肉', '尖椒肥肠', '爆炒花甲',
  '酱爆鱿鱼', '香酥鸡排', '黑椒牛柳', '芝士焗虾', '蜜汁叉烧',
  '脆皮烧肉', '烧鹅', '卤水拼盘', '凉拌黄瓜', '拍黄瓜',
  '凉拌木耳', '口水黄瓜', '凉拌海带丝', '凉拌三丝', '凉拌豆腐皮',
  '清炒莴笋', '蒜蓉娃娃菜', '上汤娃娃菜', '干煸肥肠', '辣子鸡',
  '香辣猪蹄', '红烧大肠', '爆炒腰花', '葱烧海参', '鲍汁杏鲍菇',
];

const EXTRA_SOUP_NAMES = [
  '老火靓汤', '青红萝卜排骨汤', '霸王花排骨汤', '南北杏雪梨汤',
  '竹蔗马蹄汤', '椰子鸡汤', '木瓜排骨汤', '花生鸡脚汤', '眉豆鸡脚汤',
  '土茯苓排骨汤', '菜干猪肺汤', '鸡骨草排骨汤', '苹果雪梨汤',
];

export function inventRecipeName(
  dishType: DishType,
  used: Set<string>,
  blocked: Set<string>,
): MockDish {
  const pool = dishType === 'soup' ? EXTRA_SOUP_NAMES : EXTRA_DISH_NAMES;
  for (const name of pool) {
    if (!used.has(name) && !blocked.has(name)) {
      return {
        name,
        tags: dishType === 'soup' ? ['汤品', '家常'] : ['家常', '下饭'],
        ingredients: dishType === 'soup' ? ['肉类', '蔬菜'] : ['时令食材'],
        cookMinutes: dishType === 'soup' ? 45 : 25,
        difficulty: '简单',
      };
    }
  }

  const methods = dishType === 'soup' ? ['炖', '煲', '滚'] : ['炒', '烧', '蒸', '煎', '焖'];
  const mains =
    dishType === 'soup'
      ? ['排骨', '鸡', '鱼', '豆腐', '菌菇', '萝卜']
      : ['鸡丁', '肉丝', '豆腐', '茄子', '时蔬', '虾仁', '牛肉'];
  let attempt = 0;
  while (attempt < 200) {
    const method = methods[attempt % methods.length];
    const main = mains[attempt % mains.length];
    const name = dishType === 'soup' ? `${main}${method}汤` : `${method}${main}`;
    attempt += 1;
    if (!used.has(name) && !blocked.has(name)) {
      return {
        name,
        tags: dishType === 'soup' ? ['汤品', '家常'] : ['家常', '下饭'],
        ingredients: [main],
        cookMinutes: dishType === 'soup' ? 40 : 22,
        difficulty: '简单',
      };
    }
  }

  const fallback = dishType === 'soup' ? `鲜汤${Date.now() % 10000}` : `小炒${Date.now() % 10000}`;
  return {
    name: fallback,
    tags: dishType === 'soup' ? ['汤品'] : ['家常'],
    ingredients: ['时令食材'],
    cookMinutes: 25,
    difficulty: '简单',
  };
}
