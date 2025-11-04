import { Text, View } from "react-native";

export default function AcceptInvitationScreen( { token }: { token: string } ) {

  return (
    <View>
      <Text>Accept Invitation: {token}</Text>
    </View>
  );
}   