// js/reminder.js
export const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        await Notification.requestPermission();
    }
};

export const checkReminders = (items) => {
    const today = dayjs().startOf('day');
    
    items.forEach(item => {
        const diff = dayjs(item.expiryDate).startOf('day').diff(today, 'day');
        
        const reminderDays = Array.isArray(item.reminderDays) && item.reminderDays.length
            ? item.reminderDays
            : [90, 30, 7, 1, 0];
        
        if (!item.isArchived && reminderDays.includes(diff)) {
            let msg = '';
            
            if (diff === 0) {
                msg = `Tindakan Diperlukan: Masa berlaku dokumen ${item.title} habis HARI INI!`;
            } else {
                msg = `Pengingat Layanan: Dokumen ${item.title} akan habis masa berlakunya dalam ${diff} hari.`;
            }
            
            if (Notification.permission === "granted") {
                new Notification("Layanan AdminKu", { 
                    body: msg,
                    icon: "https://cdn-icons-png.flaticon.com/512/3064/3064197.png" 
                });
            }
        }
    });
};
