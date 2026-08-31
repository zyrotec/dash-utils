import Clutter from 'gi://Clutter';

export class MouseLeaveUtil {
    constructor() { }

    public leftTop(actor: Clutter.Actor): boolean {
        const [_, pointer_y] = global.get_pointer();
        const box = actor.get_transformed_extents();

        const y_top = box.get_y();

        return pointer_y < y_top;
    }

    public leftBottom(actor: Clutter.Actor): boolean {
        const [_, pointer_y] = global.get_pointer();
        const box = actor.get_transformed_extents();

        const y_bottom = box.get_y() + box.get_height();

        return pointer_y > y_bottom;
    }

    public leftLeft(actor: Clutter.Actor): boolean {
        const [pointer_x, _] = global.get_pointer();
        const box = actor.get_transformed_extents();

        const x_left = box.get_x();

        return pointer_x < x_left;
    }

    public leftRight(actor: Clutter.Actor): boolean {
        const [pointer_x, _] = global.get_pointer();
        const box = actor.get_transformed_extents();

        const x_right = box.get_x() + box.get_width();

        return pointer_x > x_right;
    }

    public leftY(actor: Clutter.Actor): boolean {
        const [_, pointer_y] = global.get_pointer();
        const box = actor.get_transformed_extents();

        const y_top = box.get_y();
        const y_bottom = box.get_y() + box.get_height();

        return pointer_y < y_top || pointer_y > y_bottom;
    }

    public leftX(actor: Clutter.Actor): boolean {
        const [pointer_x, _] = global.get_pointer();
        const box = actor.get_transformed_extents();

        const x_left = box.get_x();
        const x_right = box.get_x() + box.get_width();

        return pointer_x < x_left || pointer_x > x_right;
    }
}