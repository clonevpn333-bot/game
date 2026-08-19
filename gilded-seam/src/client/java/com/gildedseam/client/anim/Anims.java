package com.gildedseam.client.anim;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import net.minecraft.client.animation.AnimationChannel;
import net.minecraft.client.animation.AnimationDefinition;
import net.minecraft.client.animation.Keyframe;
import net.minecraft.client.animation.KeyframeAnimations;

/**
 * Builds an {@link AnimationDefinition} from generated text.
 *
 * <p>The hand-authored animations in this package are a few keyframes each and
 * read perfectly well as Java. The generated ones do not: a solved quadruped
 * walk is fifteen bones by twenty-eight samples by two channels, which is
 * eight hundred keyframes, and written out as {@code new Keyframe(...)} calls
 * that is a hundred kilobytes of source per animation and a static initialiser
 * far past the sixty-four kilobyte limit the JVM puts on a single method. The
 * class would not compile, and the failure - "code too large" - says nothing
 * about why.
 *
 * <p>So the generated keyframes ship as strings and are parsed once at class
 * load. Strings have their own sixty-four kilobyte ceiling, which is why the
 * data arrives as an array of rows rather than one blob.
 *
 * <p>The format is one row per bone and channel:
 *
 * <pre>
 *   body|r|0=0,0,0|0.25=-12,4,0|!0.5=0,0,0;body|p|0=0,0,0|0.25=0,-1.5,0
 * </pre>
 *
 * <p>Several rows share one argument, separated by {@code ;}, because a
 * thousand separate string arguments is a thousand array stores in the same
 * static initialiser and that has a size limit of its own.
 *
 * <p>{@code r} is rotation in degrees, {@code p} is position. A time may be
 * prefixed with {@code !} for linear interpolation; the default is the
 * smooth one, since almost everything here is a curve and the exceptions are
 * the frames that want to arrive hard.
 *
 * <p>Positions are written in the bench's coordinate space, where +y points
 * down, matching {@code ModelPart}. {@link KeyframeAnimations#posVec} takes +y
 * as up, so the sign is flipped here rather than in the generator - the
 * generator's job is to describe the model, and this is the one place that
 * knows which way the game thinks is up.
 */
public final class Anims {

    private Anims() {
    }

    /**
     * @param length seconds
     * @param loop   whether it repeats
     * @param rows   generated keyframe rows, in the format described above
     */
    public static AnimationDefinition parse(float length, boolean loop, String... rows) {
        // Built through the record constructor rather than the Builder. The
        // Builder is the nicer API for hand-written animations, but it is also
        // where a version bump is most likely to rename something - `looping()`
        // in particular has no user anywhere else in this mod to prove it still
        // exists. `AnimationDefinition(float, boolean, Map)` is the record's
        // own canonical constructor and cannot drift without the record itself
        // changing shape.
        Map<String, List<AnimationChannel>> bones = new HashMap<>();
        for (String group : rows) {
            if (group == null || group.isEmpty()) {
                continue;
            }
            for (String row : group.split(";")) {
                addRow(bones, row);
            }
        }
        return new AnimationDefinition(length, loop, bones);
    }

    private static void addRow(Map<String, List<AnimationChannel>> bones, String row) {
        String[] parts = row.split("\\|");
        if (parts.length < 3) {
            return;
        }
        String bone = parts[0];
        boolean rotation = "r".equals(parts[1]);
        List<Keyframe> frames = new ArrayList<>(parts.length - 2);
        for (int i = 2; i < parts.length; i++) {
            String frame = parts[i];
            boolean linear = frame.charAt(0) == '!';
            if (linear) {
                frame = frame.substring(1);
            }
            int split = frame.indexOf('=');
            float time = Float.parseFloat(frame.substring(0, split));
            String[] xyz = frame.substring(split + 1).split(",");
            float x = Float.parseFloat(xyz[0]);
            float y = Float.parseFloat(xyz[1]);
            float z = Float.parseFloat(xyz[2]);
            frames.add(new Keyframe(time,
                    rotation ? KeyframeAnimations.degreeVec(x, y, z)
                             : KeyframeAnimations.posVec(x, -y, z),
                    linear ? AnimationChannel.Interpolations.LINEAR
                           : AnimationChannel.Interpolations.CATMULLROM));
        }
        if (frames.isEmpty()) {
            return;
        }
        bones.computeIfAbsent(bone, k -> new ArrayList<>()).add(new AnimationChannel(
                rotation ? AnimationChannel.Targets.ROTATION
                         : AnimationChannel.Targets.POSITION,
                frames.toArray(new Keyframe[0])));
    }
}
