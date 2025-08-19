const Device = require('../models/Device');

async function seedDevices({ count, startAt = 1, reset = false }) {
    if (!count || count < 1) {
        throw new Error('count ต้องมากกว่า 0');
    }

    if (reset) {
        await Device.deleteMany({});
    }

    const ops = Array.from({ length: count }, (_, i) => {
        const no = startAt + i;
        return {
            updateOne: {
                filter: { no },
                update: { $setOnInsert: { no } },
                upsert: true,
            },
        };
    });

    const result = await Device.bulkWrite(ops, { ordered: false });


    const inserted =
        (result.upsertedCount ?? 0) ||
        (result.result && result.result.upserted ? result.result.upserted.length : 0);

    const total = await Device.countDocuments();

    return { inserted, total };
}

async function listDevices() {
    return Device.find().sort({ no: 1 }).lean();
}

async function clearDevices() {
    const res = await Device.deleteMany({});
    return { deleted: res.deletedCount || 0 };
}


async function appendDevices({ count }) {
    if (!count || count < 1) throw new Error('count ต้องมากกว่า 0');

    const last = await Device.findOne().sort({ no: -1 }).lean();
    const startAt = last ? last.no + 1 : 1;
    return seedDevices({ count, startAt, reset: false });
}

module.exports = {
    seedDevices,
    listDevices,
    clearDevices,
    appendDevices,
};
