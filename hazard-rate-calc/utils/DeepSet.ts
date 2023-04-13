export class DeepSet extends Set {
    add(o: any) {
        for (let i of this) if (this.deepCompare(o, i)) return this;
        super.add.call(this, o);
        return this;
    }

    private deepCompare(o: any, i: any) {
        return JSON.stringify(o) === JSON.stringify(i);
    }
}
