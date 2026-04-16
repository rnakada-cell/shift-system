
const fs = require('fs');

let content = fs.readFileSync('/Users/rutsuki/Desktop/shift-system/app/cast/page.tsx', 'utf8');

// Replace dark colors with pink/white theme
content = content.replace(/bg-\[#050505\] text-\[#FAFAFA\]/g, 'bg-rose-50 text-gray-800');
content = content.replace(/bg-indigo-500\/10/g, 'bg-pink-300/30');
content = content.replace(/bg-purple-500\/10/g, 'bg-rose-300/30');
content = content.replace(/bg-\[#111111\]\/80/g, 'bg-white/80');
content = content.replace(/bg-\[#111111\]\/60/g, 'bg-white/60');
content = content.replace(/bg-\[#0D0D0D\]\/80/g, 'bg-white/90');
content = content.replace(/bg-\[#111111\]\/90/g, 'bg-white/90');
content = content.replace(/border-white\/5/g, 'border-pink-200');
content = content.replace(/border-white\/10/g, 'border-pink-300');
content = content.replace(/bg-white\/5/g, 'bg-pink-50/50');
content = content.replace(/bg-white\/10/g, 'bg-pink-100');
content = content.replace(/bg-white\/\[0\.02\]/g, 'bg-white');
content = content.replace(/text-white/g, 'text-gray-800 text-black'); // Quick override
content = content.replace(/text-gray-400/g, 'text-gray-500');
content = content.replace(/text-gray-500/g, 'text-gray-400');
content = content.replace(/text-indigo-400/g, 'text-pink-500');
content = content.replace(/text-indigo-500/g, 'text-pink-500');
content = content.replace(/bg-indigo-600/g, 'bg-pink-500');
content = content.replace(/border-indigo-400/g, 'border-pink-400');
content = content.replace(/from-indigo-600 to-indigo-500/g, 'from-pink-500 to-rose-400');
content = content.replace(/shadow-indigo-600\/20/g, 'shadow-pink-400/30');
content = content.replace(/shadow-\[0_0_30px_rgba\(79,70,229,0\.35\)\]/g, 'shadow-[0_0_30px_rgba(236,72,153,0.35)]');

// Inject 4-hour swap rule
const swapCheckOriginal = `                                                                onClick={async () => {
                                                                    const note = prompt("交代の理由を教えてください");`;
const swapCheckNew = `                                                                onClick={async () => {
                                                                    // 4時間未満は交代不可とするチェック
                                                                    const todaySegments = confirmedShifts.filter(shift => shift.date === selectedDate);
                                                                    let totalHours = 0;
                                                                    todaySegments.forEach(shift => {
                                                                        const ts = timeSegments.find(ts => ts.id === shift.segmentId);
                                                                        if (ts) totalHours += ts.hours;
                                                                    });
                                                                    if (totalHours < 4) {
                                                                        alert("本日の合計勤務時間が4時間未満のため、交代リクエストはできません。");
                                                                        return;
                                                                    }
                                                                    const note = prompt("交代の理由を教えてください");`;
content = content.replace(swapCheckOriginal, swapCheckNew);

fs.writeFileSync('/Users/rutsuki/Desktop/shift-system/app/cast/page.tsx', content);
console.log('App/cast/page.tsx updated with pink UI and 4h limit.');
