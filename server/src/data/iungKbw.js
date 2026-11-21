// Krytyczne wartości klimatycznego bilansu wodnego (KBW) [mm] wg IUNG-PIB.
// Źródło: https://susza.iung.pulawy.pl/progi/ (pobrane automatycznie 21.11.2026), na podstawie
// rozporządzenia MRiRW z 11.04.2019 r. Wartości jednakowe dla wszystkich województw.
// Susza = KBW w okresie sześciodekadowym poniżej progu (przeciętnie ok. 20% spadku plonu wg IUNG).
// null = brak spadków plonu z powodu suszy w tym okresie ('x'), 'nie' = uprawa niewskazana na tej kategorii gleby.
// PLIK GENEROWANY – nie poprawiaj ręcznie.

// 14 okresów sześciodekadowych: [miesiąc startu, dzień startu, miesiąc końca, dzień końca].
export const IUNG_PERIODS = [[3, 21, 5, 20], [4, 1, 5, 31], [4, 11, 6, 10], [4, 21, 6, 20], [5, 1, 6, 30], [5, 11, 7, 10], [5, 21, 7, 20], [6, 1, 7, 31], [6, 11, 8, 10], [6, 21, 8, 20], [7, 1, 8, 31], [7, 11, 9, 10], [7, 21, 9, 20], [8, 1, 9, 30]];

export const IUNG_THRESHOLDS = {
  zboza_ozime: {
    I: [-129, -132, -137, -145, -154, -165, -180, -199, -220, null, null, null, null, null],
    II: [-150, -153, -158, -166, -175, -186, -201, -220, -241, null, null, null, null, null],
    III: [-188, -191, -196, -204, -213, -224, -239, -258, -279, null, null, null, null, null],
    IV: [-215, -218, -223, -231, -240, -251, -266, -285, -306, null, null, null, null, null],
  },
  zboza_jare: {
    I: [-125, -127, -130, -135, -142, -153, -169, -186, -207, null, null, null, null, null],
    II: [-144, -146, -149, -154, -161, -172, -188, -205, -226, null, null, null, null, null],
    III: [-174, -176, -179, -184, -191, -202, -218, -235, -256, null, null, null, null, null],
    IV: [-194, -196, -199, -204, -211, -222, -238, -255, -276, null, null, null, null, null],
  },
  kukurydza_ziarno: {
    I: [null, null, null, -168, -161, -156, -153, -152, -153, -154, -156, -158, -161, -164],
    II: [null, null, null, -200, -193, -188, -185, -184, -185, -186, -188, -190, -193, -196],
    III: [null, null, null, -236, -229, -224, -221, -220, -221, -222, -224, -226, -229, -232],
    IV: [null, null, null, -271, -264, -259, -256, -255, -256, -257, -259, -261, -264, -267],
  },
  kukurydza_kiszonka: {
    I: [null, null, null, -168, -161, -156, -153, -152, -152, -152, -153, -155, -157, -160],
    II: [null, null, null, -200, -193, -188, -185, -184, -184, -184, -185, -187, -189, -192],
    III: [null, null, null, -236, -229, -224, -221, -220, -220, -220, -221, -223, -225, -228],
    IV: [null, null, null, -271, -264, -259, -256, -255, -255, -255, -256, -258, -260, -263],
  },
  rzepak: {
    I: [-207, -187, -170, -155, -142, -132, null, null, null, null, null, null, -138, -138],
    II: [-232, -211, -193, -177, -165, -155, null, null, null, null, null, null, -158, -158],
    III: [-275, -254, -236, -220, -208, -198, null, null, null, null, null, null, -205, -205],
    IV: [-297, -276, -258, -242, -230, -220, null, null, null, null, null, null, -230, -230],
  },
  ziemniak: {
    I: [null, null, -238, -232, -226, -219, -210, -200, -189, -178, -168, -157, -147, null],
    II: [null, null, -257, -251, -245, -238, -229, -219, -208, -197, -187, -176, -166, null],
    III: [null, null, -286, -280, -274, -267, -258, -248, -237, -226, -216, -205, -195, null],
    IV: [null, null, -306, -300, -294, -287, -278, -268, -257, -246, -236, -225, -215, null],
  },
  burak: {
    I: ["nie", "nie", "nie", "nie", "nie", "nie", "nie", "nie", "nie", "nie", "nie", "nie", "nie", "nie"],
    II: [-250, -248, -245, -241, -237, -232, -226, -220, -212, -202, -192, -182, -169, -155],
    III: [-277, -275, -272, -268, -264, -259, -253, -247, -239, -229, -219, -209, -196, -182],
    IV: [-296, -294, -291, -287, -283, -278, -272, -266, -258, -248, -238, -228, -215, -201],
  },
  chmiel: {
    I: [null, null, null, -230, -220, -212, -205, -199, -194, -190, -186, -182, null, null],
    II: [null, null, null, -248, -238, -230, -223, -217, -212, -208, -204, -200, null, null],
    III: [null, null, null, -285, -275, -267, -260, -254, -249, -245, -241, -237, null, null],
    IV: [null, null, null, -302, -292, -284, -277, -271, -266, -262, -258, -254, null, null],
  },
  tyton: {
    I: [null, null, null, -189, -187, -186, -185, -186, -187, -190, -195, -200, null, null],
    II: [null, null, null, -201, -199, -198, -197, -198, -199, -202, -207, -212, null, null],
    III: [null, null, null, -227, -225, -224, -223, -224, -225, -228, -233, -238, null, null],
    IV: [null, null, null, -240, -238, -237, -236, -237, -238, -241, -246, -251, null, null],
  },
  warzywa: {
    I: [null, null, null, -189, -187, -185, -184, -184, -184, -185, -187, -188, null, null],
    II: [null, null, null, -207, -205, -203, -202, -202, -202, -203, -205, -206, null, null],
    III: [null, null, null, -243, -241, -239, -238, -238, -238, -239, -241, -242, null, null],
    IV: [null, null, null, -263, -261, -259, -258, -258, -258, -259, -261, -262, null, null],
  },
  krzewy_owocowe: {
    I: [-149, -148, -147, -147, -149, -154, -159, -162, -163, -162, -160, -157, null, null],
    II: [-166, -165, -164, -164, -166, -171, -176, -179, -180, -179, -177, -174, null, null],
    III: [-200, -199, -198, -198, -200, -205, -210, -213, -214, -213, -211, -208, null, null],
    IV: [-217, -216, -215, -215, -217, -222, -227, -230, -231, -230, -228, -225, null, null],
  },
  drzewa_owocowe: {
    I: [-168, -171, -175, -180, -187, -193, -199, -205, -210, -215, -220, -223, null, null],
    II: [-190, -193, -197, -202, -209, -215, -221, -227, -232, -237, -242, -245, null, null],
    III: [-229, -232, -236, -241, -248, -254, -260, -266, -271, -276, -281, -284, null, null],
    IV: [-249, -252, -256, -261, -268, -274, -280, -286, -291, -296, -301, -304, null, null],
  },
  truskawki: {
    I: [-133, -137, -143, -152, -163, -178, -190, -198, -202, null, null, null, null, null],
    II: [-150, -154, -160, -169, -180, -195, -207, -215, -219, null, null, null, null, null],
    III: [-183, -187, -193, -202, -213, -228, -240, -248, -252, null, null, null, null, null],
    IV: [-204, -208, -214, -223, -234, -249, -261, -269, -273, null, null, null, null, null],
  },
  straczkowe: {
    I: [null, null, null, -161, -161, -163, -165, -166, -167, -168, -170, -172, -174, -176],
    II: [null, null, null, -182, -182, -184, -186, -187, -188, -189, -191, -193, -195, -197],
    III: [null, null, null, -213, -213, -215, -217, -218, -219, -220, -222, -224, -226, -228],
    IV: [null, null, null, -234, -234, -236, -238, -239, -240, -241, -243, -245, -247, -249],
  },
};
