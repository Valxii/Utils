class StreamBuffer {
	constructor(array = []) {
		this.index = 0;
		this.array = new Uint8Array(array);
	}
	readByte() {
		return this.array[this.index++];
	}
	read(count) {
		let arr = new Uint8Array(Math.min(count, this.array.length - this.index));
		for (let i = 0; i < arr.length; i++) arr.set([this.readByte()], i);
		return arr;
	}
	writeByte(byte) {
		this.array = new Uint8Array([...this.array, byte]);
		this.index++;
	}
	write(array) {
		for (let i = 0; i < array.length; i++) this.writeByte(array[i])
	}
}

// TYPES
function protoReverse() {
	return this.map(a => new this.constructor(new Uint8Array(new this.constructor([a])
			.buffer)
		.reverse()
		.buffer)[0])
}

function protoByte() {
	return new Uint8Array(this.reversed()
		.buffer);
}

Uint16Array.prototype.bytes =
	Int16Array.prototype.bytes =
	BigUint64Array.prototype.bytes =
	BigInt64Array.prototype.bytes =
	Float64Array.prototype.bytes =
	Float32Array.prototype.bytes =
	Uint32Array.prototype.bytes =
	Int32Array.prototype.bytes = protoByte;
Uint16Array.prototype.reversed =
	Int16Array.prototype.reversed =
	BigUint64Array.prototype.reversed =
	BigInt64Array.prototype.reversed =
	Float64Array.prototype.reversed =
	Float32Array.prototype.reversed =
	Uint32Array.prototype.reversed =
	Int32Array.prototype.reversed = protoReverse;

class TType {
	constructor(type, typeCode, value) {
		this.type = type;
		this.typeCode = typeCode;
		this.value = value;
	}
	result() {
		return this.value
	} // BYTES
	size() {
		return this.value.length
	} // NUMBER
	read(buf, full = 0, size = -1) {
		let res = new this.constructor(new Uint8Array(
			buf.read(size + 1 ? size : this.size())
		));
		return full ? res : res.value;
	}
	write(buf, full = 0) {
		if (full) buf.writeByte(this.typeCode);
		buf.write(this.result());
	}
}

class Byte extends TType {
	constructor(value = 0) {
		if (value.buffer) {
			super('Byte', 98, value[0])
		} else {
			super('Byte', 98, value);
		}
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : []), this.value]);
	}
	size() {
		return 1;
	}
}

class Bool extends TType {
	constructor(value = 0) {
		if (value.buffer) {
			super('Bool', 111, value[0] ? 1 : 0)
		} else {
			super('Bool', 111, value ? 1 : 0);
		}
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : []), this.value ? 1 : 0]);
	}
	size() {
		return 1;
	}
}

class Short extends TType {
	constructor(value = 0) {
		if (value.buffer) {
			super('Short', 107, new Int16Array(value.reverse()
				.buffer)[0])
		} else {
			super('Short', 107, value);
		}
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : []), ...new Int16Array([this.value])
			.bytes()]);
	}
	size() {
		return 2;
	}
}

class Int extends TType {
	constructor(value = 0) {
		if (value.buffer) {
			super('Int', 105, new Int32Array(value.reverse()
				.buffer)[0])
		} else {
			super('Int', 105, value);
		}
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : []), ...new Int32Array([this.value])
			.bytes()]);
	}
	size() {
		return 4;
	}
}

class Long extends TType {
	constructor(value = 0) {
		if (value.buffer) {
			super('Long', 108, new BigInt64Array(value.reverse()
				.buffer)[0])
		} else {
			super('Long', 108, value);
		}
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : []), ...new BigInt64Array([this.value])
			.bytes()]);
	}
	size() {
		return 8;
	}
}

class Float extends TType {
	constructor(value = 0) {
		if (value.buffer) {
			super('Float', 102, new Float32Array(value.reverse()
				.buffer)[0])
		} else {
			super('Float', 102, value);
		}
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : []), ...new Float32Array([this.value])
			.bytes()]);
	}
	size() {
		return 4;
	}
}

class Double extends TType {
	constructor(value = 0) {
		if (value.buffer) {
			super('Double', 100, new Double64Array(value.reverse()
				.buffer)[0])
		} else {
			super('Double', 100, value);
		}
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : []), ...new Float64Array([this.value])
			.bytes()]);
	}
	size() {
		return 8;
	}
}

class ByteArray extends TType {
	constructor(value = []) {
		super('ByteArray', 120, new Uint8Array([...value]))
	}
	result(full = 0) {
		return new Uint8Array([
			...(full ? [this.typeCode] : []),
			...new Int(this.size())
			.result(),
			...this.value
		]);
	}
	size() {
		return this.value.length;
	}
	read(buf, full = 0, size = -1) {
		size = size + 1 ? size : new Int()
			.read(buf);
		let res = new this.constructor(new Uint8Array(buf.read(size)));
		return full ? res : res.value;
	}
}

class Null extends TType {
	constructor(value = 0) {
		super('Null', 42, null);
	}
	result(full = 0) {
		return new Uint8Array([...(full ? [this.typeCode] : [])]);
	}
	size() {
		return 0;
	}
}

class TString extends TType {
	constructor(value = '') {
		if (value.buffer) {
			super('TString', 115, new TextDecoder()
				.decode(value))
		} else {
			super('TString', 115, value);
		}
	}
	size() {
		return new TextEncoder()
			.encode(this.value)
			.length
	}
	result(full = 0) {
		return new Uint8Array([
			...(full ? [this.typeCode] : []),
			...new Short(this.size())
			.result(),
			...new TextEncoder()
			.encode(this.value)
		]);
	}
	read(buf, full = 0, size = -1) {
		size = size + 1 ? size : new Short()
			.read(buf);
		let res = new this.constructor(new Uint8Array(buf.read(size)));
		return full ? res : res.value;
	}
}

class TArray extends TType { //{key:value,...}
	constructor(value = [], TValue = 121) {
		super('TArray', 121, value);
		this.TValue = TValue;
	}
	size() {
		return this.value.length
	}
	result(full = 0) {
		let arr = [];
		for (let k in this.value) {
			if (this.value[k].result) {
				arr = [
					...arr,
					...this.value[k].result()
				];
			}
		}
		return new Uint8Array([
			...(full ? [this.typeCode] : []),
			...new Short(this.size())
			.result(),
			...new Byte(this.TValue)
			.result(),
			...arr
		]);
	}
	read(buf, full = 0, size = -1) {
		size = size + 1 ? size : new Short()
			.read(buf);
		let b = new Byte()
			.read(buf); //type
		let arr = new this.constructor([], b);
		if (b == 121) { //TArray
			arr.value = [new TArray()
				.read(buf, full)];
			for (let i = 1; i < size; i++)
				arr.value[i] = new TArray()
				.read(buf, full);
		} else {
			if (b == 120) { //Array<ByteArray>
				for (let i = 0; i < size; i++)
					arr.value[i] = new ByteArray()
					.read(buf, full);
			} else {
				if (b == 98) { //ByteArray
					arr.value = new ByteArray()
						.read(buf, full, size);
				} else {
					if (b == 105) { //IntArray
						for (let i = 0; i < size; i++)
							arr.value[i] = new Int()
							.read(buf, full);
					} else {
						if (b == 68) { //Dictionary
							for (let i = 0; i < size; i++)
								arr.value[i] = new Dictionary()
								.read(buf, full);
							return full ? arr : arr.value;
						}
						for (let i = 0; i < size; i++)
							arr.value[i] = new Call()
							.read(buf, full, b); //other types
					}
				}
			}
		}
		return full ? arr : arr.value;
	}
}

class Hashtable extends TType { // { key: value, ... }
	constructor(value = {}) {
		super('Hashtable', 104, value);
	}
	size() {
		return Object.keys(this.value)
			.length
	}
	result(full = 0) {
		let arr = [];
		for (let k in this.value) {
			if (this.value[k].result) {
				arr = [
					...arr,
					...new Byte(Number(k))
					.result(1),
					...this.value[k].result(1)
				];
			}
		}
		return new Uint8Array([
			...(full ? [this.typeCode] : []),
			...new Short(this.size())
			.result(),
			...arr
		]);
	}
	read(buf, full = 0, size = -1) {
		size = size + 1 ? size : new Short()
			.read(buf);
		arr = {};
		for (let i = 0; i < size; i++) {
			let key = new Call()
				.read(buf);
			let value = new Call()
				.read(buf, full);
			if (!(key === null)) {
				arr[key] = value;
			}
		}
		let res = new this.constructor(arr);
		return full ? res : res.value;
	}
}

class Dictionary extends TType { // [ { key: "", value: {} }, ... ]
	constructor(value = [], TKey, TValue) {
		super('Dictionary', 68, value);
		this.TKey = TKey;
		this.TValue = TValue;
	}
	size() {
		return this.value.length
	}

	result(full = 0) {
		let arr = [];
		for (let i in this.value) {
			arr = [
				...arr,
				...this.value[i].key.result(this.TKey == 0),
				...this.value[i].value.result(this.TValue == 0)
			];
		}
		return new Uint8Array([
			...(full ? [this.typeCode] : []),
			...new Byte(this.TKey)
			.result(),
			...new Byte(this.TValue)
			.result(),
			...new Short(this.size())
			.result(),
			...arr
		]);
	}
	read(buf, full = 0, size = -1) {
		let TKey = new Byte()
			.read(buf);
		let TValue = new Byte()
			.read(buf);
		size = new Short()
			.read(buf);
		let arr = [];
		for (let i = 0; i < size; i++) {
			let key = new Call()
				.read(buf, full, TKey || -1);
			let value = new Call()
				.read(buf, full, TValue || -1);
			if (!(key === null)) {
				arr.push({
					key,
					value
				});
			}
		}
		let res = new this.constructor(arr, TKey, TValue);
		return full ? res : res.value;
	}
}

class Call {
	constructor() {}
	read(buf, full = 0, type = -1) {
		type = type + 1 ? type : new Byte()
			.read(buf);
		if (!type) throw "No type: " + type;
		if (!GpType[type]) throw "Unknown typeCode: " + type;
		return new GpType[type]()
			.read(buf, full)
	}
}

const GpType = {
	0: 0 && Unknown,

	111: Bool,
	98: Byte,
	107: Short,
	105: Int,
	108: Long,
	102: Float,
	100: Double,
	115: TString,

	121: TArray,
	120: ByteArray,
	119: 0 && IntArray,
	97: 0 && StringArray,
	122: 0 && ObjectArray,

	104: Hashtable,
	68: Dictionary,

	99: 0 && Custom,
	101: 0 && EventData,
	113: 0 && OperationRequest,
	112: 0 && OperationResponse
};

function parseSocket(arr0, full = 1) {
	if (arr0.length == 3) return {
		header: [...arr0.slice(0, 2)],
		opCode: arr0[2],
		result: function() {
			return toSocket(this)
		}
	};
	// 243,2,opCode,length,length
	let buf = new StreamBuffer(arr0);
	buf.index = 3;
	let arr = {
		header: [...arr0.slice(0, 2)],
		opCode: arr0[2],
		size: new Short()
			.read(buf)
	};
	for (let i = 0; i < arr.size; i++) {
		let slot = new Byte()
			.read(buf);
		arr[slot] = new Call()
			.read(buf, full);
	}
	arr.result = function() {
		return toSocket(this)
	};
	return arr;
}

function Enum([definition]) {
	let ci = 0;
	return Object.freeze(
		definition.trim()
		.replace(/\s*,\s*/g, ' ')
		.replace(/\s*=\s*/g, '=')
		.split(/\s+/)
		.reduce((old, p) => {
			ci = p.split('=')[1] ? Number(p.split('=')[1]) : ci;
			return {
				...old,
					[p.split('=')[0]]: ci++
			}
		}, {})
	);
}

const MVEventCodes = Enum `
NoCodeSet,
UnregisterWorldObject,
UpdateWorldObject,
UpdateWorldObjectData,
UpdateWorldObjectDataPartial,
RemoveWorldObjectDataPartial,
TransferOwnership,
UpdateNetworkInput,
RegisterPrototype,
UnregisterPrototype,
UpdatePrototype,
UpdatePrototypeScale,
UpdateTerrain,
AddLink,
RemoveLink,
RemoveItemFromInventory,
FriendRequest,
FriendUpdate,
TriggerBoxEnter,
TriggerBoxExit,
TriggerBoxStayBegin,
TriggerBoxStayEnd,
Clone,
LockHierarchy,
BlueprintCreationDone,
WoUniquePrototype,
GameStateChange,
SyncAvatarStatus,
ResetLogicChunk,
UpdateWorldObjectRunTimeData,
PickupItemStateChange,
UpdateLineOfFire,
WorldObjectRPCEvent,
XPReceivedEvent,
PostGameMsgEvent,
SetTeam,
AddObjectLink,
RemoveObjectLink,
TransferWorldObjectsToGroup,
CloneWorldObjectTree,
GetGameBatch,
GameQueryReady,
PostWinnerReport,
CollectiblePickedUp,
SetWorldObjectsToPurchasedEvent,
AchievementUnlockedEvent,
AttachWorldObjectToSeat,
DetachWorldObjectFromVehicle,
SpawnVehicleWithDriver,
Reward,
RuntimeEvent,
ResetTerrainEvent,
UpdateGameStat,
UpdateGameStatType,
UpdateAvatarMetaData,
LevelChanged,
GameBoostEvent,
NotificationEvent,
RequestMaterials,
GetPlanetOwnershipTypes,
GetItemCategories,
SetupUserPlayMode,
GameSnapshotData,
SetActorReady,
RequestFriends,
GetItemInventory,
GetItemShopInventory,
GetBuiltInItemBusinessData,
LargeDBQueryAvatarShopInventory,
InitializeAvatarEdit,
GetActiveAvatar,
PendingByteDataBatch,
SwitchAvatar,
SyncronizePing,
StartRewardCountDown,
RewardIsReady,
NumberOfPendingRewards,
JoinNotification,
CloneWorldObjectTreeWithPosition,
CloneTempWorldObjectWithOriginalReferenceEvent,
LogicObjectFiringStateChange,
LogicFrame,
CollectTheItemDropOff,
LogicFastForward,
LogicFastForwardEventImmediate,
ForceDetachWorldObjectFromVehicle,
XPReward,
GetProfileMetaData,
ServerError,
SetSayChatBubbleVisible,
GetPublishedPlanetProfileData,
PlayerPlanetData,
PlayerPlanetRemote,
HighScores,
GoldRewardedForLevel,
NextLevelGoldReward,
PlayerTierStateCalculatorChanged,
GetProjectEarnings,
TopHighScores,
GetKogamaVat,
GetSubscriptionPerksData,
SetupUserAvatarEdit,
SetupUserBuildMode,
SetActiveSpawnRole,
ReplicateSpawnRoleData,
SetSpawnRoleBody,
XPRewardedAdReady,
Join = 255,
Leave = 254,
PropertiesChanged = 253
`;
