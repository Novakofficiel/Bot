const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const ROLE_1_ID = '1331721592538927189'; // Remplace par l'ID du rôle à surveiller
const ALERT_CHANNEL_ID = '1341151004820901898'; // ID du salon alerte
const BAN_DELAY = 10000; // 10 secondes

client.on('ready', async () => {
    console.log(`${client.user.tag} est en ligne !`);

    // Vérification des membres existants au démarrage du bot
    for (const guild of client.guilds.cache) {
        const members = await guild.members.fetch();
    }
    members.forEach(member => {
        if (member.roles.cache.has(ROLE_1_ID)) {
            console.log(`${member.user.tag} a déjà le rôle interdit !`);
            // Si un membre a déjà le rôle, l'alerte s'active immédiatement
            handleRoleAlert(member);
        }
    });
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    console.log(`Mise à jour des rôles pour ${newMember.user.tag}`);
    
    // Vérifier si le rôle 1 a été attribué au membre pour la première fois
    if (!oldMember.roles.cache.has(ROLE_1_ID) && newMember.roles.cache.has(ROLE_1_ID)) {
        console.log(`Rôle ${ROLE_1_ID} attribué à ${newMember.user.tag}.`);
        handleRoleAlert(newMember);
    }
});

client.on('guildMemberAdd', async (member) => {
    console.log(`Nouveau membre rejoint : ${member.user.tag}`);
    
    // Vérifier si le nouveau membre a le rôle interdit dès son arrivée
    if (member.roles.cache.has(ROLE_1_ID)) {
        console.log(`${member.user.tag} a rejoint avec le rôle interdit !`);
        handleRoleAlert(member);
    }
});

async function handleRoleAlert(member) {
    const alertChannel = member.guild.channels.cache.get(ALERT_CHANNEL_ID);
    if (alertChannel) {
        // Création d'un embed pour l'alerte
        const alertEmbed = new EmbedBuilder()
            .setColor('#FF0000') // Rouge (pour l'alerte)
            .setTitle(`⚠️ Alerte rôle interdit`)
            .setDescription(`**${member.user.tag}** a pris le rôle interdit.\nBannissement dans \`\`${BAN_DELAY / 1000} secondes\`\`...`)
            .setTimestamp()
            .setFooter({ text: 'Système de gestion des rôles' });

        // Envoi du message initial avec l'embed
        const alertMessage = await alertChannel.send({ embeds: [alertEmbed] });
        
        let timeLeft = BAN_DELAY / 1000;
        
        // Compte à rebours
        const countdownInterval = setInterval(async () => {
            timeLeft--;
            if (timeLeft > 0) {
                // Mise à jour du message à chaque seconde avec le timer dans l'embed
                alertEmbed.setDescription(`**${member.user.tag}** a pris le rôle interdit.\nBannissement dans \`\`${timeLeft} secondes\`\`...`);
                await alertMessage.edit({ embeds: [alertEmbed] });
            }
        }, 1000);
        
        setTimeout(async () => {
            clearInterval(countdownInterval);  // Arrêt du compte à rebours
            
            const refreshedMember = await member.guild.members.fetch(member.id);
            if (refreshedMember.roles.cache.has(ROLE_1_ID)) {
                // Si le membre a toujours le rôle, on le bannit
                try {
                    await refreshedMember.ban({ reason: 'Non respect des règles du serveur (1)' });
                    console.log(`${refreshedMember.user.tag} a été banni pour non respect des règles.`);

                    // Notification dans le canal d'alerte avec un embed
                    const banEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle(`🚨 | Rôle interdit détecté !`)
                        .setDescription(`**${refreshedMember.user.tag}** a été banni pour non respect des règles (1).`)
                        .setTimestamp()
                        .setFooter({ text: 'Système de gestion des rôles' });
                    
                    alertChannel.send({ embeds: [banEmbed] });
                } catch (error) {
                    console.error(`Erreur lors du bannissement de ${refreshedMember.user.tag} :`, error);
                }
            } else {
                // Si le membre retire le rôle, le bannissement est annulé
                alertEmbed.setColor('#00FF00') // Vert pour le succès
                    .setDescription(`✅ | **${member.user.tag}** a retiré le rôle interdit à temps, bannissement annulé.`);

                alertMessage.edit({ embeds: [alertEmbed] });
            }
        }, BAN_DELAY);
    }
}
