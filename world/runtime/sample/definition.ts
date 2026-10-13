import art from '../../assets/sample/manifest.json'

export { art }
// Coordinates are authored against the clean master painting, never inferred from the viewport.
export const sample = {
  initial: { x: 820, y: 465 },
  narrowInitialX: 690,
  scale: 0.96,
  rotor: { x: 1426, y: 166, radius: 53 },
  resident: { x: 838, y: 421, height: 91 },
  hens: [
    { route: [[525, 421], [577, 449], [635, 428], [587, 411]], phase: 0, height: 24 },
    { route: [[412, 394], [466, 403], [490, 423], [435, 413]], phase: 18, height: 23 },
  ],
  // Only the water surface is masked; stones, crossings and greenery stay perfectly still.
  water: [
    [[1389, 377], [1428, 394], [1459, 442], [1491, 474], [1480, 482], [1445, 452], [1412, 411], [1384, 392]],
    [[1480, 613], [1507, 624], [1495, 659], [1490, 696], [1506, 730], [1503, 781], [1480, 792], [1478, 743], [1465, 712], [1467, 672]],
    [[1503, 793], [1551, 827], [1599, 848], [1615, 876], [1647, 897], [1639, 922], [1601, 901], [1579, 875], [1540, 852], [1495, 819]],
    [[1330, 318], [1361, 314], [1371, 320], [1356, 331], [1324, 333]],
  ],
  waterRuns: [
    [[1393, 385], [1419, 402], [1452, 447], [1481, 476]],
    [[1494, 622], [1480, 682], [1496, 752], [1490, 789]],
    [[1500, 805], [1550, 840], [1590, 859], [1615, 890], [1642, 909]],
  ],
  pouring: [[1338, 294], [1331, 307], [1326, 321]],
}
